"""Qdrant client and collection lifecycle helpers.

Key rule: collection creation must be explicit and idempotent. Do not create
collections at import time, because imports happen during server startup.
"""

from __future__ import annotations

from functools import lru_cache

from qdrant_client import QdrantClient, models
from qdrant_client.models import Distance

from settings import settings


QDRANT_URL = settings.QDRANT_URL
COLLECTION_NAME = settings.QDRANT_COLLECTION_NAME

# `BAAI/bge-base-en-v1.5` embedding dimension.
VECTOR_SIZE = 768
DISTANCE = Distance.COSINE

@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    """Return a cached Qdrant client.

    Important: we keep this lazy to avoid network calls during module import.
    """
    return QdrantClient(url=QDRANT_URL)


def init_collection(*, client: QdrantClient | None = None) -> None:
    """Create the collection with the expected vector configuration."""
    qdrant_client = client or get_client()
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=VECTOR_SIZE, distance=DISTANCE),
        quantization_config=models.ScalarQuantization(
            scalar=models.ScalarQuantizationConfig(
                type=models.ScalarType.INT8,
                quantile=0.99,
                always_ram=True,
            ),
        ),
    )


def ensure_collection(*, recreate: bool = True) -> None:
    """Ensure the Qdrant collection exists with the correct config.

    If `recreate=True`, deletes the collection if it exists and recreates it.
    If `recreate=False`, creates it only if missing.
    """
    qdrant_client = get_client()

    if recreate:
        if qdrant_client.collection_exists(COLLECTION_NAME):
            qdrant_client.delete_collection(COLLECTION_NAME)
        init_collection(client=qdrant_client)
        return

    if not qdrant_client.collection_exists(COLLECTION_NAME):
        init_collection(client=qdrant_client)
