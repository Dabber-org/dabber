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

Startup strategy is selected from:
- `RESCRAPE` setting
- whether the Qdrant collection exists
- whether local scraped JSON pages exist

Decision tree:
1. `RESCRAPE=true`:
   - force rebuild (`ensure_collection(recreate=True)`), then scrape + embed.
2. `RESCRAPE=false` and collection missing:
   - first-run ingest (`ensure_collection(recreate=False)`), then scrape + embed.
3. `RESCRAPE=false` and collection exists + local scraped files exist:
   - reuse existing vectors (skip scrape/embed), rebuild BM25 from local pages, activate search.
4. `RESCRAPE=false` and collection exists + local scraped files missing:
   - recovery rebuild (`ensure_collection(recreate=True)`), then scrape + embed.

Full ingest path:
1. `scrape/scraper.py`: `scrape_website()` writes JSON pages to Crawlee local storage
2. `SimpleDirectoryReader` loads page-level Documents:
   - `.pdf` via `PDFReader(return_full_document=False)`
   - `.json` via `ScrapeJSONPageReader` (embeds only `text`, keeps `url/title/...` metadata)
3. `embeddings.py`: `get_embed_model()` (BGE) and store vectors into Qdrant
4. `retrieval/hybrid_search.py`: `init_search(index)` to enable hybrid retrieval

Reuse-existing path:
1. Build `VectorStoreIndex` from existing Qdrant vectors.
2. Build BM25 retriever from local scraped page documents.
3. Call `init_search(index, bm25_retriever=...)` to activate hybrid retrieval.

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

