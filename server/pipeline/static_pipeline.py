from __future__ import annotations

"""Static indexing pipeline.

Startup strategy:
- `RESCRAPE=true`: force full rebuild (clear collection, scrape, embed).
- `RESCRAPE=false` and no collection: first-run full ingest.
- `RESCRAPE=false` and collection exists + local pages exist: reuse existing index.
- `RESCRAPE=false` and collection exists + local pages missing: recovery rebuild.
"""

import asyncio
import logging
from enum import Enum
from pathlib import Path

from llama_index.core import Settings, SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.readers.file import PDFReader
from llama_index.retrievers.bm25 import BM25Retriever
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import AsyncQdrantClient

from embeddings import get_embed_model
from pipeline.config import pipeline_settings
from retrieval.bm25 import BM25Config, build_bm25_retriever
from retrieval.hybrid_search import init_search
from scrape.json_page_reader import ScrapeJSONPageReader
from scrape.scraper import scrape_website
from settings import settings
from storage import qdrant

logger = logging.getLogger(__name__)
_pipeline_lock: asyncio.Lock | None = None
_pipeline_initialized = False


class StartupStrategy(str, Enum):
    FORCE_REBUILD = "force_rebuild"
    FIRST_RUN_REBUILD = "first_run_rebuild"
    REUSE_EXISTING = "reuse_existing"
    RECOVERY_REBUILD = "recovery_rebuild"


def choose_startup_strategy(
    *,
    rescrape: bool,
    collection_exists: bool,
    has_local_pages: bool,
) -> StartupStrategy:
    """Decide static pipeline startup strategy from runtime state."""
    if rescrape:
        return StartupStrategy.FORCE_REBUILD
    if not collection_exists:
        return StartupStrategy.FIRST_RUN_REBUILD
    if not has_local_pages:
        return StartupStrategy.RECOVERY_REBUILD
    return StartupStrategy.REUSE_EXISTING


def _collection_exists() -> bool:
    return qdrant.get_client().collection_exists(qdrant.COLLECTION_NAME)


def _has_local_scraped_pages() -> bool:
    dataset_dir = Path(pipeline_settings.SCRAPE_DATASET_DIR)
    if not dataset_dir.exists():
        return False
    for page_file in dataset_dir.rglob("*.json"):
        if page_file.is_file() and page_file.name != "__metadata__.json":
            return True
    return False


def _load_documents():
    reader = SimpleDirectoryReader(
        input_dir=pipeline_settings.SCRAPE_DATASET_DIR,
        recursive=True,
        exclude=["__metadata__.json"],
        # Page-level for PDFs and web pages.
        file_extractor={
            ".pdf": PDFReader(return_full_document=False),
            ".json": ScrapeJSONPageReader(),
        },
    )
    return reader.load_data()


def _build_vector_store() -> QdrantVectorStore:
    client = qdrant.get_client()
    aclient = AsyncQdrantClient(url=qdrant.QDRANT_URL)
    return QdrantVectorStore(
        client=client,
        aclient=aclient,
        collection_name=qdrant.COLLECTION_NAME,
    )


async def _full_ingest(*, recreate: bool) -> None:
    await asyncio.to_thread(qdrant.ensure_collection, recreate=recreate)

    logger.info("Starting pipeline: scraping website...")
    await scrape_website()
    logger.info("Scraping completed successfully.")

    documents = await asyncio.to_thread(_load_documents)

    vector_store = _build_vector_store()
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    Settings.embed_model = get_embed_model()

    index = VectorStoreIndex.from_documents(
        documents=documents,
        storage_context=storage_context,
        use_async=True,
        transformations=[],
        show_progress=pipeline_settings.INDEX_SHOW_PROGRESS,
        store_nodes_override=True,  # keep nodes in docstore for BM25
    )
    init_search(index)


async def _initialize_from_existing() -> None:
    await asyncio.to_thread(qdrant.ensure_collection, recreate=False)

    documents = await asyncio.to_thread(_load_documents)
    if not documents:
        raise RuntimeError(
            "No local scraped pages found for BM25 initialization; "
            "expected recovery rebuild strategy to handle this state."
        )

    Settings.embed_model = get_embed_model()

    vector_store = _build_vector_store()
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=Settings.embed_model,
    )
    bm25_retriever: BM25Retriever = build_bm25_retriever(
        documents,
        config=BM25Config(similarity_top_k=50, language=None),
    )
    init_search(index, bm25_retriever=bm25_retriever)


async def run_pipeline(mcp=None) -> None:
    """Run the static pipeline. `mcp` is reserved for future integrations."""
    global _pipeline_lock, _pipeline_initialized
    if _pipeline_lock is None:
        _pipeline_lock = asyncio.Lock()

    async with _pipeline_lock:
        if _pipeline_initialized:
            logger.info("Pipeline already initialized; skipping duplicate run.")
            return

        try:
            collection_exists = await asyncio.to_thread(_collection_exists)
            has_local_pages = await asyncio.to_thread(_has_local_scraped_pages)
            strategy = choose_startup_strategy(
                rescrape=settings.RESCRAPE,
                collection_exists=collection_exists,
                has_local_pages=has_local_pages,
            )

            if strategy == StartupStrategy.FORCE_REBUILD:
                logger.info(
                    "Startup strategy: force rebuild "
                    "(RESCRAPE=true)."
                )
                await _full_ingest(recreate=True)
            elif strategy == StartupStrategy.FIRST_RUN_REBUILD:
                logger.info(
                    "Startup strategy: first-run rebuild "
                    "(RESCRAPE=false and no existing collection)."
                )
                await _full_ingest(recreate=False)
            elif strategy == StartupStrategy.RECOVERY_REBUILD:
                logger.info(
                    "Startup strategy: recovery rebuild "
                    "(collection exists but local scraped files are missing)."
                )
                await _full_ingest(recreate=True)
            else:
                logger.info(
                    "Startup strategy: reuse existing "
                    "(RESCRAPE=false with existing collection and local scraped files)."
                )
                await _initialize_from_existing()

            _pipeline_initialized = True
            logger.info(
                "Pipeline completed successfully.",
            )
        except Exception:
            logger.exception("Pipeline failed.")
            raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_pipeline(None))
