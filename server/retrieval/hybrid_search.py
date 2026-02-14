"""Hybrid retrieval tool (semantic + lexical) with dual outputs.

- Retrieval unit: a page (PDF page or one scraped web page JSON file).
- Semantic: Qdrant-backed retriever from the built `VectorStoreIndex`.
- Lexical: BM25Retriever over the same index's docstore.
- Fusion: Reciprocal Rank Fusion (RRF) via `QueryFusionRetriever`.

Tool output includes BOTH:
- `snippet_text`: always capped to `max_chars`.
- `compressed_text`: only computed when the original is longer than `max_chars`.

Compression is sentence-level selection using `SentenceEmbeddingOptimizer` and runs
on deep copies to avoid mutating nodes stored in the index/docstore.
"""

from __future__ import annotations

import asyncio
import copy
from typing import Any, Dict, List

from llama_index.core import VectorStoreIndex
from llama_index.core.postprocessor.optimizer import SentenceEmbeddingOptimizer
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.retrievers.fusion_retriever import (
    FUSION_MODES,
    QueryFusionRetriever,
)
from llama_index.core.schema import MetadataMode, NodeWithScore, QueryBundle
from llama_index.core.utils import globals_helper
from llama_index.retrievers.bm25 import BM25Retriever

from retrieval.bm25 import BM25Config, build_bm25_from_index
from settings import settings

_INDEX: VectorStoreIndex | None = None
_BM25_BASE: BM25Retriever | None = None


def init_search(index: VectorStoreIndex, *, bm25_max_k: int = 50) -> None:
    """Initialize global hybrid-search state (called by the indexing pipeline)."""
    global _INDEX, _BM25_BASE
    _INDEX = index
    _BM25_BASE = build_bm25_from_index(
        index,
        config=BM25Config(similarity_top_k=bm25_max_k, language=None),
    )


class TopKWrapperRetriever(BaseRetriever):
    """Wrap a retriever and cap its results without mutating the wrapped retriever."""

    def __init__(self, base: BaseRetriever, *, top_k: int) -> None:
        super().__init__()
        self._base = base
        self._top_k = top_k

    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        return self._base.retrieve(query_bundle)[: self._top_k]

    async def _aretrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        return (await self._base.aretrieve(query_bundle))[: self._top_k]


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return str(value)


def _deep_copy_node(node: Any) -> Any:
    try:
        return node.model_copy(deep=True)
    except Exception:
        return copy.deepcopy(node)


def _rrf_fuse(
    results: List[List[NodeWithScore]], *, k: float = 60.0
) -> List[NodeWithScore]:
    """Fuse multiple ranked lists using Reciprocal Rank Fusion (RRF)."""
    fused_scores: Dict[str, float] = {}
    hash_to_node: Dict[str, NodeWithScore] = {}

    for nodes_with_scores in results:
        for rank, node_with_score in enumerate(
            sorted(nodes_with_scores, key=lambda x: x.score or 0.0, reverse=True)
        ):
            node_hash = node_with_score.node.hash
            hash_to_node[node_hash] = node_with_score
            fused_scores[node_hash] = fused_scores.get(node_hash, 0.0) + 1.0 / (
                rank + k
            )

    reranked = sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
    reranked_nodes: List[NodeWithScore] = []
    for node_hash, score in reranked:
        node_with_score = hash_to_node[node_hash]
        node_with_score.score = score
        reranked_nodes.append(node_with_score)

    return reranked_nodes


async def vector_db(
    query: str,
    n_results: int = 5,
    *,
    max_chars: int = 2000,
    semantic_top_k: int = 30,
    lexical_top_k: int = 30,
    compress_percentile: float = 0.2,
    context_before: int = 1,
    context_after: int = 1,
) -> Dict[str, Any]:
    """Hybrid page-level retrieval (MCP tool: vector_db) that returns both snippet + conditional compression.

    Args:
        query: User query string.
        n_results: Number of fused results to return (after RRF ranking).
        max_chars: Output cap used for both `snippet_text` and `compressed_text`.
        semantic_top_k: Candidate pool size for vector retrieval.
        lexical_top_k: Candidate pool size for BM25 retrieval.
        compress_percentile: Percent of sentences to keep when compressing long pages.
        context_before/context_after: Neighbor sentences to include around selected sentences.
    """
    if _INDEX is None or _BM25_BASE is None:
        return {"error": "search_not_ready"}

    vector_retriever = _INDEX.as_retriever(similarity_top_k=semantic_top_k)
    bm25_retriever = TopKWrapperRetriever(_BM25_BASE, top_k=lexical_top_k)

    query_bundle = QueryBundle(query)
    use_query_expansion = (
        settings.QUERY_EXPANSION_ENABLED
        and settings.QUERY_EXPANSION_NUM_QUERIES > 1
    )

    if use_query_expansion:
        try:
            hybrid = QueryFusionRetriever(
                retrievers=[vector_retriever, bm25_retriever],
                mode=FUSION_MODES.RECIPROCAL_RANK,
                similarity_top_k=n_results,
                num_queries=settings.QUERY_EXPANSION_NUM_QUERIES,
                use_async=True,
            )
            nodes: List[NodeWithScore] = await hybrid.aretrieve(query_bundle)
        except ValueError as exc:
            return {
                "error": "llm_not_configured",
                "detail": str(exc),
            }
    else:
        vector_nodes, bm25_nodes = await asyncio.gather(
            vector_retriever.aretrieve(query_bundle),
            bm25_retriever.aretrieve(query_bundle),
        )
        nodes = _rrf_fuse([vector_nodes, bm25_nodes])[:n_results]

    results: List[Dict[str, Any]] = []
    for rank, nws in enumerate(nodes, start=1):
        node = nws.node
        original_text = node.get_content(metadata_mode=MetadataMode.NONE)
        original_chars = len(original_text)

        snippet_text = original_text[:max_chars]
        snippet_truncated = original_chars > max_chars

        compression_applied = False
        compressed_text = snippet_text
        compressed_truncated = False
        compression_error = None

        if original_chars > max_chars:
            try:
                node_copy = _deep_copy_node(node)
                if getattr(node_copy, "metadata", None):
                    # Avoid URL/title/etc. biasing sentence selection.
                    node_copy.excluded_llm_metadata_keys = list(node_copy.metadata.keys())

                # Guarantee >= 1 sentence is selected.
                llm_text = node_copy.get_content(metadata_mode=MetadataMode.LLM)
                sentences = globals_helper.punkt_tokenizer.tokenize(llm_text)
                effective_percentile = compress_percentile
                if sentences:
                    effective_percentile = max(effective_percentile, 1.0 / len(sentences))
                effective_percentile = min(1.0, max(0.0, effective_percentile))

                optimizer = SentenceEmbeddingOptimizer(
                    percentile_cutoff=effective_percentile,
                    context_before=context_before,
                    context_after=context_after,
                )

                nws_copy = NodeWithScore(node=node_copy, score=nws.score)
                optimized = optimizer.postprocess_nodes(
                    [nws_copy], query_bundle=query_bundle
                )
                compressed_full = optimized[0].node.get_content(
                    metadata_mode=MetadataMode.NONE
                )
                compressed_truncated = len(compressed_full) > max_chars
                compressed_text = compressed_full[:max_chars]
                compression_applied = True
            except Exception as e:
                compression_error = str(e)

        results.append(
            {
                "rank": rank,
                "score": nws.score,
                "node_id": getattr(node, "node_id", None),
                "metadata": _json_safe(getattr(node, "metadata", {}) or {}),
                "original_chars": original_chars,
                "snippet_text": snippet_text,
                "snippet_truncated": snippet_truncated,
                "compressed_text": compressed_text,
                "compression_applied": compression_applied,
                "compressed_truncated": compressed_truncated,
                "compression_error": compression_error,
            }
        )

    return {
        "query": query,
        "n_results": n_results,
        "max_chars": max_chars,
        "semantic_top_k": semantic_top_k,
        "lexical_top_k": lexical_top_k,
        "compress_percentile": compress_percentile,
        "context_before": context_before,
        "context_after": context_after,
        "results": results,
    }
