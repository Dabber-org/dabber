"""Retrieval-specific settings loaded from environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parent.parent


class RetrievalSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(SERVER_ROOT / ".env"), extra="ignore")

    # Query expansion (LLM-generated variants) for hybrid retrieval.
    QUERY_EXPANSION_ENABLED: bool = False
    QUERY_EXPANSION_NUM_QUERIES: int = 4

    # Retrieval defaults (used by the vector_db tool when callers omit args).
    # These values favor balanced quality/cost on noisy enterprise pages.
    RETRIEVAL_N_RESULTS_DEFAULT: int = 8
    RETRIEVAL_MAX_CHARS_DEFAULT: int = 2000
    RETRIEVAL_SEMANTIC_TOP_K_DEFAULT: int = 36
    RETRIEVAL_LEXICAL_TOP_K_DEFAULT: int = 36
    RETRIEVAL_COMPRESS_PERCENTILE_DEFAULT: float = 0.2
    RETRIEVAL_CONTEXT_BEFORE_DEFAULT: int = 1
    RETRIEVAL_CONTEXT_AFTER_DEFAULT: int = 1
    RETRIEVAL_METADATA_RANK_BOOST_DEFAULT: float = 0.35

    # Adaptive retrieval: run a cheap first pass and escalate only when confidence is low.
    RETRIEVAL_ADAPTIVE_ENABLED: bool = True
    RETRIEVAL_ESCALATION_SEMANTIC_TOP_K: int = 80
    RETRIEVAL_ESCALATION_LEXICAL_TOP_K: int = 80
    RETRIEVAL_MIN_CONFIDENCE_TO_SKIP_ESCALATION: float = 0.65

    # Compression cost controls.
    RETRIEVAL_MAX_COMPRESSED_RESULTS: int = 3
    RETRIEVAL_MIN_SNIPPET_QUERY_COVERAGE: float = 0.35

    # Lightweight deterministic query expansion (zero LLM cost).
    RETRIEVAL_RULE_BASED_QUERY_EXPANSION_ENABLED: bool = True


retrieval_settings = RetrievalSettings()
