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
from statistics import mean
from typing import Any, Dict, List, Set
from urllib.parse import urlsplit, urlunsplit

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
from retrieval.config import retrieval_settings

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


def _extract_node_url(node_metadata: Dict[str, Any]) -> str:
    """Return the best available URL for a node from normalized metadata keys."""
    direct_url = node_metadata.get("url")
    if isinstance(direct_url, str) and direct_url.strip():
        return direct_url.strip()

    source_metadata = _extract_source_metadata(node_metadata)
    for key in ("sourceURL", "url", "ogUrl", "canonical"):
        value = source_metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _normalize_url_for_dedupe(url: str) -> str:
    """Normalize URL for stable dedupe (scheme/host case, trailing slash, query/fragment)."""
    normalized = url.strip()
    if not normalized:
        return normalized

    try:
        parsed = urlsplit(normalized)
    except Exception:
        return normalized.lower().rstrip("/")

    if not parsed.scheme and not parsed.netloc:
        return normalized.lower().rstrip("/")

    path = parsed.path or "/"
    path = re.sub(r"/{2,}", "/", path)
    if path != "/":
        path = path.rstrip("/")

    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), path, "", ""))


def _dedupe_nodes_by_source(nodes: List[NodeWithScore]) -> List[NodeWithScore]:
    """Keep the highest-ranked node per canonical source URL."""
    deduped: List[NodeWithScore] = []
    seen_keys: set[str] = set()

    for node_with_score in nodes:
        metadata = getattr(node_with_score.node, "metadata", None)
        node_metadata = metadata if isinstance(metadata, dict) else {}

        source_url = _normalize_url_for_dedupe(_extract_node_url(node_metadata))
        if source_url:
            dedupe_key = f"url:{source_url}"
        else:
            node_hash = getattr(node_with_score.node, "hash", "") or getattr(
                node_with_score.node, "node_id", ""
            )
            dedupe_key = f"node:{node_hash}"

        if dedupe_key in seen_keys:
            continue

        seen_keys.add(dedupe_key)
        deduped.append(node_with_score)

    return deduped


def _query_anchored_snippet(text: str, query: str, max_chars: int) -> str:
    """Build a snippet around the longest matching query token when possible."""
    if max_chars <= 0:
        return ""
    if len(text) <= max_chars:
        return text

    query_tokens = sorted(
        {tok for tok in re.findall(r"[a-z0-9]+", query.lower()) if len(tok) >= 3},
        key=len,
        reverse=True,
    )
    text_lower = text.lower()

    anchor = -1
    for token in query_tokens:
        index = text_lower.find(token)
        if index >= 0:
            anchor = index
            break

    if anchor < 0:
        return text[:max_chars]

    half = max_chars // 2
    start = max(0, anchor - half)
    end = min(len(text), start + max_chars)
    if end - start < max_chars:
        start = max(0, end - max_chars)
    return text[start:end]


def _clamp_int(
    value: int,
    *,
    min_value: int,
    max_value: int,
) -> int:
    return max(min_value, min(max_value, int(value)))


def _clamp_float(
    value: float,
    *,
    min_value: float,
    max_value: float,
) -> float:
    return max(min_value, min(max_value, float(value)))


def _query_tokens(query: str) -> Set[str]:
    return {tok for tok in re.findall(r"[a-z0-9]+", query.lower()) if len(tok) >= 3}


def _expand_query_rule_based(query: str) -> str:
    tokens = _query_tokens(query)
    extra_terms: List[str] = []

    if "dean" in tokens:
        extra_terms.extend(["head", "department head", "dean office"])
    if "head" in tokens:
        extra_terms.extend(["dean", "department dean"])
    if "coordinator" in tokens:
        extra_terms.extend(["program coordinator", "academic coordinator"])
    if "office" in tokens or "where" in tokens or "location" in tokens:
        extra_terms.extend(["room", "building", "contact"])

    if not extra_terms:
        return query

    # Keep deterministic ordering and avoid duplicate terms.
    deduped_terms: List[str] = []
    seen: Set[str] = set()
    for term in extra_terms:
        key = term.lower().strip()
        if key and key not in seen:
            seen.add(key)
            deduped_terms.append(term)
    return f"{query} {' '.join(deduped_terms)}"


def _snippet_query_coverage(snippet: str, query_tokens: Set[str]) -> float:
    if not query_tokens:
        return 1.0
    snippet_tokens = set(re.findall(r"[a-z0-9]+", snippet.lower()))
    if not snippet_tokens:
        return 0.0
    overlap = len(query_tokens.intersection(snippet_tokens))
    return overlap / len(query_tokens)


def _node_source_key(node_with_score: NodeWithScore) -> str:
    metadata = getattr(node_with_score.node, "metadata", None)
    node_metadata = metadata if isinstance(metadata, dict) else {}
    source_url = _normalize_url_for_dedupe(_extract_node_url(node_metadata))
    if source_url:
        return source_url
    node_hash = getattr(node_with_score.node, "hash", "") or getattr(
        node_with_score.node, "node_id", ""
    )
    return str(node_hash or "")


def _estimate_retrieval_confidence(
    nodes: List[NodeWithScore],
    *,
    query: str,
    max_chars: int,
) -> float:
    if not nodes:
        return 0.0

    query_toks = _query_tokens(query)
    snippet_coverages: List[float] = []
    source_keys: Set[str] = set()

    for node_with_score in nodes:
        node = node_with_score.node
        text = node.get_content(metadata_mode=MetadataMode.NONE)
        snippet = _query_anchored_snippet(text, query, max_chars)
        snippet_coverages.append(_snippet_query_coverage(snippet, query_toks))
        source_key = _node_source_key(node_with_score)
        if source_key:
            source_keys.add(source_key)

    top_coverage = max(snippet_coverages) if snippet_coverages else 0.0
    mean_top3 = mean(sorted(snippet_coverages, reverse=True)[:3]) if snippet_coverages else 0.0
    source_diversity = min(1.0, len(source_keys) / 2.0)

    # Weighted blend: strongest evidence + consistency + cross-source support.
    return (0.45 * top_coverage) + (0.35 * mean_top3) + (0.20 * source_diversity)


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
    n_results: int = retrieval_settings.RETRIEVAL_N_RESULTS_DEFAULT,
    *,
    max_chars: int = retrieval_settings.RETRIEVAL_MAX_CHARS_DEFAULT,
    semantic_top_k: int = retrieval_settings.RETRIEVAL_SEMANTIC_TOP_K_DEFAULT,
    lexical_top_k: int = retrieval_settings.RETRIEVAL_LEXICAL_TOP_K_DEFAULT,
    compress_percentile: float = retrieval_settings.RETRIEVAL_COMPRESS_PERCENTILE_DEFAULT,
    context_before: int = retrieval_settings.RETRIEVAL_CONTEXT_BEFORE_DEFAULT,
    context_after: int = retrieval_settings.RETRIEVAL_CONTEXT_AFTER_DEFAULT,
    filter_host: str | None = None,
    filter_path_prefix: str | None = None,
    filter_language: str | None = None,
    filter_content_type: str | None = None,
    filter_status_code: int | None = None,
    metadata_rank_boost: float = retrieval_settings.RETRIEVAL_METADATA_RANK_BOOST_DEFAULT,
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

    # Guardrails to keep latency/cost predictable and avoid pathological inputs.
    n_results = _clamp_int(n_results, min_value=1, max_value=50)
    max_chars = _clamp_int(max_chars, min_value=256, max_value=8000)
    semantic_top_k = _clamp_int(semantic_top_k, min_value=1, max_value=200)
    lexical_top_k = _clamp_int(lexical_top_k, min_value=1, max_value=200)
    compress_percentile = _clamp_float(
        compress_percentile,
        min_value=0.05,
        max_value=1.0,
    )
    context_before = _clamp_int(context_before, min_value=0, max_value=3)
    context_after = _clamp_int(context_after, min_value=0, max_value=3)
    metadata_rank_boost = _clamp_float(metadata_rank_boost, min_value=0.0, max_value=1.0)

    # Ensure candidate pools are at least as large as requested final output.
    semantic_top_k = max(semantic_top_k, n_results)
    lexical_top_k = max(lexical_top_k, n_results)

    retrieval_query = (
        _expand_query_rule_based(query)
        if retrieval_settings.RETRIEVAL_RULE_BASED_QUERY_EXPANSION_ENABLED
        else query
    )
    query_bundle = QueryBundle(retrieval_query)
    use_query_expansion = (
        retrieval_settings.QUERY_EXPANSION_ENABLED
        and retrieval_settings.QUERY_EXPANSION_NUM_QUERIES > 1
    )

    async def _retrieve_nodes(
        *,
        current_n_results: int,
        current_semantic_top_k: int,
        current_lexical_top_k: int,
    ) -> List[NodeWithScore]:
        vector_retriever = _INDEX.as_retriever(similarity_top_k=current_semantic_top_k)
        bm25_retriever = TopKWrapperRetriever(_BM25_BASE, top_k=current_lexical_top_k)

        if use_query_expansion:
            hybrid = QueryFusionRetriever(
                retrievers=[vector_retriever, bm25_retriever],
                mode=FUSION_MODES.RECIPROCAL_RANK,
                similarity_top_k=current_n_results,
                num_queries=retrieval_settings.QUERY_EXPANSION_NUM_QUERIES,
                use_async=True,
            )
            candidate_nodes: List[NodeWithScore] = await hybrid.aretrieve(query_bundle)
        else:
            vector_nodes, bm25_nodes = await asyncio.gather(
                vector_retriever.aretrieve(query_bundle),
                bm25_retriever.aretrieve(query_bundle),
            )
            candidate_nodes = _rrf_fuse([vector_nodes, bm25_nodes])

        candidate_nodes = _filter_nodes_by_metadata(
            candidate_nodes,
            filter_host=filter_host,
            filter_path_prefix=filter_path_prefix,
            filter_language=filter_language,
            filter_content_type=filter_content_type,
            filter_status_code=filter_status_code,
        )
        candidate_nodes = _rerank_by_metadata(
            candidate_nodes,
            query=query,
            metadata_rank_boost=metadata_rank_boost,
        )
        return _dedupe_nodes_by_source(candidate_nodes)[:current_n_results]

    try:
        nodes: List[NodeWithScore] = await _retrieve_nodes(
            current_n_results=n_results,
            current_semantic_top_k=semantic_top_k,
            current_lexical_top_k=lexical_top_k,
        )
    except ValueError as exc:
        return {
            "error": "llm_not_configured",
            "detail": str(exc),
        }

    adaptive_enabled = bool(retrieval_settings.RETRIEVAL_ADAPTIVE_ENABLED)
    escalation_semantic_top_k = _clamp_int(
        retrieval_settings.RETRIEVAL_ESCALATION_SEMANTIC_TOP_K,
        min_value=1,
        max_value=200,
    )
    escalation_lexical_top_k = _clamp_int(
        retrieval_settings.RETRIEVAL_ESCALATION_LEXICAL_TOP_K,
        min_value=1,
        max_value=200,
    )
    min_confidence_to_skip_escalation = _clamp_float(
        retrieval_settings.RETRIEVAL_MIN_CONFIDENCE_TO_SKIP_ESCALATION,
        min_value=0.0,
        max_value=1.0,
    )

    retrieval_confidence = _estimate_retrieval_confidence(
        nodes,
        query=query,
        max_chars=max_chars,
    )
    retrieval_escalated = False

    if adaptive_enabled and retrieval_confidence < min_confidence_to_skip_escalation:
        target_semantic_top_k = max(semantic_top_k, escalation_semantic_top_k, n_results)
        target_lexical_top_k = max(lexical_top_k, escalation_lexical_top_k, n_results)
        if target_semantic_top_k > semantic_top_k or target_lexical_top_k > lexical_top_k:
            nodes = await _retrieve_nodes(
                current_n_results=n_results,
                current_semantic_top_k=target_semantic_top_k,
                current_lexical_top_k=target_lexical_top_k,
            )
            retrieval_confidence = _estimate_retrieval_confidence(
                nodes,
                query=query,
                max_chars=max_chars,
            )
            retrieval_escalated = True

    max_compressed_results = _clamp_int(
        retrieval_settings.RETRIEVAL_MAX_COMPRESSED_RESULTS,
        min_value=0,
        max_value=20,
    )
    min_snippet_query_coverage = _clamp_float(
        retrieval_settings.RETRIEVAL_MIN_SNIPPET_QUERY_COVERAGE,
        min_value=0.0,
        max_value=1.0,
    )
    query_toks = _query_tokens(query)
    compression_budget_used = 0

    results: List[Dict[str, Any]] = []
    for rank, nws in enumerate(nodes, start=1):
        node = nws.node
        original_text = node.get_content(metadata_mode=MetadataMode.NONE)
        original_chars = len(original_text)

        snippet_text = _query_anchored_snippet(original_text, query, max_chars)
        snippet_query_coverage = _snippet_query_coverage(snippet_text, query_toks)
        snippet_truncated = original_chars > max_chars

        compression_applied = False
        compressed_text = snippet_text
        compressed_truncated = False
        compression_error = None

        should_attempt_compression = (
            original_chars > max_chars
            and compression_budget_used < max_compressed_results
            and (
                rank <= max_compressed_results
                or snippet_query_coverage < min_snippet_query_coverage
            )
        )

        if should_attempt_compression:
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
                compression_budget_used += 1
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
                "snippet_query_coverage": round(snippet_query_coverage, 4),
                "snippet_truncated": snippet_truncated,
                "compressed_text": compressed_text,
                "compression_applied": compression_applied,
                "compressed_truncated": compressed_truncated,
                "compression_error": compression_error,
            }
        )

    return {
        "query": query,
        "retrieval_query": retrieval_query,
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
        "adaptive_enabled": adaptive_enabled,
        "rule_based_query_expansion_enabled": retrieval_settings.RETRIEVAL_RULE_BASED_QUERY_EXPANSION_ENABLED,
        "retrieval_confidence": round(retrieval_confidence, 4),
        "retrieval_escalated": retrieval_escalated,
        "min_confidence_to_skip_escalation": min_confidence_to_skip_escalation,
        "max_compressed_results": max_compressed_results,
        "min_snippet_query_coverage": min_snippet_query_coverage,
        "results": results,
    }
