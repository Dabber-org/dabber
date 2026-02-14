from __future__ import annotations

"""Static indexing pipeline.

Steps:
1. Ensure Qdrant collection exists (optionally recreate).
2. Scrape a website into page-level JSON files (Crawlee dataset format).
3. Read pages (PDF pages + scraped JSON pages) as page-level Documents.
4. Embed with the configured embedding model and store vectors in Qdrant.
5. Initialize hybrid retrieval (BM25 + Qdrant) for the MCP tool.
"""

import asyncio
import logging

from llama_index.core import Settings, SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.readers.file import PDFReader
from llama_index.vector_stores.qdrant import QdrantVectorStore
from qdrant_client import AsyncQdrantClient

from embeddings import get_embed_model
from scrape.json_page_reader import ScrapeJSONPageReader
from scrape.scraper import scrape_website
from retrieval.hybrid_search import init_search
from settings import settings
from storage import qdrant

logger = logging.getLogger(__name__)


async def run_pipeline(mcp=None) -> None:
    """Run the static pipeline. `mcp` is reserved for future integrations."""
    try:
        await asyncio.to_thread(qdrant.ensure_collection, recreate=True)

        logger.info("Starting pipeline: scraping website...")
        await scrape_website()
        logger.info("Scraping completed successfully.")

        reader = SimpleDirectoryReader(
            input_dir=settings.SCRAPE_DATASET_DIR,
            recursive=True,
            exclude=["__metadata__.json"],
            # Page-level for PDFs and web pages.
            file_extractor={
                ".pdf": PDFReader(return_full_document=False),
                ".json": ScrapeJSONPageReader(),
            },
        )
        documents = reader.load_data()

        client = qdrant.get_client()
        aclient = AsyncQdrantClient(url=qdrant.QDRANT_URL)
        vector_store = QdrantVectorStore(
            client=client,
            aclient=aclient,
            collection_name=qdrant.COLLECTION_NAME,
        )
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        Settings.embed_model = get_embed_model()

        index = VectorStoreIndex.from_documents(
            documents=documents,
            storage_context=storage_context,
            use_async=True,
            transformations=[],
            show_progress=True,
            store_nodes_override=True,  # keep nodes in docstore for BM25
)

        init_search(index)

        logger.info("Pipeline completed successfully.")
    except Exception:
        logger.exception("Pipeline failed.")
        raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_pipeline(None))
