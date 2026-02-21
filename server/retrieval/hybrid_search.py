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
import re
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


def init_search(
    index: VectorStoreIndex,
    *,
    bm25_max_k: int = 50,
    bm25_retriever: BM25Retriever | None = None,
) -> None:
    """Initialize global hybrid-search state (called by the indexing pipeline).

    Args:
        index: Vector index used for semantic retrieval.
        bm25_max_k: Default BM25 top-k when building BM25 from index docstore.
        bm25_retriever: Optional prebuilt BM25 retriever.
    """
    global _INDEX, _BM25_BASE
    _INDEX = index
    if bm25_retriever is not None:
        _BM25_BASE = bm25_retriever
        return

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


def _extract_source_metadata(node_metadata: Dict[str, Any]) -> Dict[str, Any]:
    metadata = node_metadata.get("metadata")
    if isinstance(metadata, dict):
        return metadata
    # Legacy key from older snapshots.
    legacy_metadata = node_metadata.get("firecrawl_metadata")
    if isinstance(legacy_metadata, dict):
        return legacy_metadata
    return {}


def _node_matches_metadata_filters(
    node_metadata: Dict[str, Any],
    *,
    filter_host: str | None,
    filter_path_prefix: str | None,
    filter_language: str | None,
    filter_content_type: str | None,
    filter_status_code: int | None,
) -> bool:
    meta_filters = node_metadata.get("meta_filters")
    meta_filters_dict = meta_filters if isinstance(meta_filters, dict) else {}
    source_metadata = _extract_source_metadata(node_metadata)

    source_host = str(meta_filters_dict.get("source_host") or "").strip().lower()
    source_path = str(meta_filters_dict.get("source_path") or "").strip()
    language = str(
        meta_filters_dict.get("language") or source_metadata.get("language") or ""
    ).strip().lower()
    content_type = str(
        meta_filters_dict.get("content_type")
        or source_metadata.get("contentType")
        or ""
    ).strip().lower()

    status_code_raw = (
        meta_filters_dict.get("status_code") or source_metadata.get("statusCode")
    )
    try:
        status_code = int(status_code_raw) if status_code_raw is not None else None
    except Exception:
        status_code = None

    if filter_host and source_host != filter_host.strip().lower():
        return False
    if filter_path_prefix and not source_path.startswith(filter_path_prefix.strip()):
        return False
    if filter_language and language != filter_language.strip().lower():
        return False
    if filter_content_type and filter_content_type.strip().lower() not in content_type:
        return False
    if filter_status_code is not None and status_code != int(filter_status_code):
        return False
    return True


def _filter_nodes_by_metadata(
    nodes: List[NodeWithScore],
    *,
    filter_host: str | None,
    filter_path_prefix: str | None,
    filter_language: str | None,
    filter_content_type: str | None,
    filter_status_code: int | None,
) -> List[NodeWithScore]:
    if not any(
        (
            filter_host,
            filter_path_prefix,
            filter_language,
            filter_content_type,
            filter_status_code is not None,
        )
    ):
        return nodes

    filtered: List[NodeWithScore] = []
    for node_with_score in nodes:
        metadata = getattr(node_with_score.node, "metadata", None)
        node_metadata = metadata if isinstance(metadata, dict) else {}
        if _node_matches_metadata_filters(
            node_metadata,
            filter_host=filter_host,
            filter_path_prefix=filter_path_prefix,
            filter_language=filter_language,
            filter_content_type=filter_content_type,
            filter_status_code=filter_status_code,
        ):
            filtered.append(node_with_score)
    return filtered


def _metadata_rank_bonus(
    query: str,
    node_metadata: Dict[str, Any],
    *,
    metadata_rank_boost: float,
) -> float:
    if metadata_rank_boost <= 0:
        return 0.0

    query_tokens = {
        tok for tok in re.findall(r"[a-z0-9]+", query.lower()) if len(tok) >= 3
    }
    if not query_tokens:
        return 0.0

    source_metadata = _extract_source_metadata(node_metadata)
    text_fields = [
        node_metadata.get("title"),
        node_metadata.get("url"),
        source_metadata.get("title"),
        source_metadata.get("description"),
        source_metadata.get("ogTitle"),
        source_metadata.get("og:description"),
        source_metadata.get("sourceURL"),
        source_metadata.get("contentType"),
    ]
    corpus = " ".join(str(v) for v in text_fields if isinstance(v, str) and v.strip())
    if not corpus:
        return 0.0

    corpus_tokens = {
        tok for tok in re.findall(r"[a-z0-9]+", corpus.lower()) if len(tok) >= 3
    }
    overlap = len(query_tokens.intersection(corpus_tokens))
    if overlap == 0:
        return 0.0

    return metadata_rank_boost * (overlap / len(query_tokens))


def _rerank_by_metadata(
    nodes: List[NodeWithScore],
    *,
    query: str,
    metadata_rank_boost: float,
) -> List[NodeWithScore]:
    if metadata_rank_boost <= 0:
        return nodes

    reranked: List[NodeWithScore] = []
    for node_with_score in nodes:
        metadata = getattr(node_with_score.node, "metadata", None)
        node_metadata = metadata if isinstance(metadata, dict) else {}
        bonus = _metadata_rank_bonus(
            query,
            node_metadata,
            metadata_rank_boost=metadata_rank_boost,
        )
        node_with_score.score = float(node_with_score.score or 0.0) + bonus
        reranked.append(node_with_score)

    return sorted(reranked, key=lambda x: x.score or 0.0, reverse=True)


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
    filter_host: str | None = None,
    filter_path_prefix: str | None = None,
    filter_language: str | None = None,
    filter_content_type: str | None = None,
    filter_status_code: int | None = None,
    metadata_rank_boost: float = 0.2,
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
        filter_*: Optional metadata filters applied before final ranking/output.
        metadata_rank_boost: Metadata-match score boost for final reranking.
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
        nodes = _rrf_fuse([vector_nodes, bm25_nodes])

    nodes = _filter_nodes_by_metadata(
        nodes,
        filter_host=filter_host,
        filter_path_prefix=filter_path_prefix,
        filter_language=filter_language,
        filter_content_type=filter_content_type,
        filter_status_code=filter_status_code,
    )
    nodes = _rerank_by_metadata(
        nodes,
        query=query,
        metadata_rank_boost=metadata_rank_boost,
    )[:n_results]

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
        "filter_host": filter_host,
        "filter_path_prefix": filter_path_prefix,
        "filter_language": filter_language,
        "filter_content_type": filter_content_type,
        "filter_status_code": filter_status_code,
        "metadata_rank_boost": metadata_rank_boost,
        "results": results,
    }
