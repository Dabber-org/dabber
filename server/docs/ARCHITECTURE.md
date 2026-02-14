# Architecture (Brief)

## Startup

Entry point: `app.py`.

At runtime the server:
1. Loads settings from `.env` (`settings.py`).
2. Chooses a mode (dynamic, static, both) in `resolve_mode()`.
3. If dynamic is enabled, generates MCP tools from an OpenAPI spec.
4. If static is enabled:
   - registers `vector_db` immediately (so it can return `search_not_ready` while indexing runs)
   - runs the static indexing pipeline in the background.

## Static Indexing Pipeline

Pipeline: `pipeline/static_pipeline.py`

Steps:
1. `storage/qdrant.py`: `ensure_collection(recreate=True)`
2. `scrape/scraper.py`: `scrape_website()` writes JSON pages to Crawlee local storage
3. `SimpleDirectoryReader` loads page-level Documents:
   - `.pdf` via `PDFReader(return_full_document=False)`
   - `.json` via `ScrapeJSONPageReader` (embeds only `text`, keeps `url/title/...` metadata)
4. `embeddings.py`: `get_embed_model()` (BGE) and store vectors into Qdrant
5. `retrieval/hybrid_search.py`: `init_search(index)` to enable hybrid retrieval

## Retrieval (Hybrid + Dual Output)

Tool: `retrieval/hybrid_search.py::vector_db`

1. Build two retrievers over the same index:
   - vector retriever (Qdrant-backed)
   - BM25 retriever (lexical) over index docstore
2. Fuse with Reciprocal Rank Fusion (RRF) to get the final ranked list.
3. For each result return:
   - `snippet_text`: always truncated to `max_chars`
   - `compressed_text`: only computed when the page is longer than `max_chars`
     - sentence selection uses `SentenceEmbeddingOptimizer`
     - compression runs on deep-copied nodes to avoid mutating stored index nodes

