"""Embedding model configuration.

Important: do NOT instantiate heavy embedding models at import time.
This module exposes a lazy, cached getter so the server can start even when
models are not yet present in the local cache.
"""

from __future__ import annotations

from functools import lru_cache

from llama_index.embeddings.huggingface import HuggingFaceEmbedding

from settings import settings


@lru_cache(maxsize=1)
def get_embed_model() -> HuggingFaceEmbedding:
    """Return the configured embedding model (cached)."""
    return HuggingFaceEmbedding(model_name=settings.EMBED_MODEL_NAME)

