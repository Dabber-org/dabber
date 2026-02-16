# Dabber MCP Server

Python MCP server that can:
- expose Dynamic tools generated from an OpenAPI spec, and/or
- run a Static indexing pipeline (scrape -> embed -> store in Qdrant) and expose hybrid retrieval.

## What This Repo Does

### Static pipeline (page-level indexing)
1. Scrape a website into page-level JSON files (Crawlee dataset format).
2. Load documents at page-level:
   - PDFs: one Document per PDF page (`PDFReader(return_full_document=False)`).
   - Web pages: one Document per JSON file (`ScrapeJSONPageReader`, embeds only `text` and keeps `url/title` as metadata).
3. Embed with `BAAI/bge-base-en-v1.5` (768 dims) and store vectors in Qdrant.
4. Initialize one hybrid retrieval tool.

### Hybrid search tool (single MCP tool returning both variants)
Tool name: `vector_db`
- Semantic: Qdrant vector retrieval
- Lexical: BM25 over the same index docstore
- Fusion: RRF (reciprocal rank fusion)
- Output per result includes BOTH:
  - `snippet_text`: always capped to `max_chars` (default 2000)
  - `compressed_text`: only computed when the original page is longer than `max_chars` (sentence selection + context)

## Project Layout (Canonical)
 
All "real" implementation lives at the `server/` root:
- `app.py`: FastMCP server entrypoint and mode wiring
- `settings.py`: env-based settings (loads `.env`)
- `pipeline/static_pipeline.py`: static scrape/index pipeline
- `storage/qdrant.py`: Qdrant collection lifecycle (`ensure_collection`)
- `retrieval/hybrid_search.py`: `vector_db` tool + init
- `scrape/*`: scraper + JSON page reader
- `embeddings.py`: lazy embedding model getter (avoid import-time downloads)

More details: `docs/ARCHITECTURE.md`

## Prerequisites

- Python 3.12+
- `uv` (recommended for env/deps)
- Qdrant running locally
- Playwright (Chromium) installed for scraping

### Run Qdrant (Docker Compose)
```bash
docker compose -f docker-compose.qdrant.yml up -d
```

### Playwright
```bash
playwright install --with-deps chromium
```

## Setup

```bash
uv venv
uv sync
```

## Run

```bash
python app.py
```

Server listens on `http://localhost:8000`.

## Configuration

Configured via `.env` (see `.env.example`).

Important vars:
- `IS_STATIC_ENABLED`: run static pipeline in background on startup
- `IS_DYNAMIC_ENABLED`: enable OpenAPI tool generation
- `SCRAPING_URL`: site root to crawl
- `OPENAPI_URL`: URL to OpenAPI spec (if dynamic enabled)
- `API_BASE_URL`: base URL for calling the API (if dynamic enabled)
- `QDRANT_URL`: default `http://localhost:6333`
- `QDRANT_COLLECTION_NAME`: default `latest`
- `SCRAPE_STORAGE_DIR`: default `./scrape/storage`
- `SCRAPE_DATASET_DIR`: default `./scrape/storage/datasets/default`
- `EMBED_MODEL_NAME`: default `BAAI/bge-base-en-v1.5`
- `QUERY_EXPANSION_ENABLED`: enable LLM query expansion for hybrid retrieval (default `false`, requires an LLM configuration; OpenAI by default)
- `QUERY_EXPANSION_NUM_QUERIES`: number of expanded queries when enabled (default `4`)

## Notes / Troubleshooting

- Qdrant "collection already exists" (409) is handled by `ensure_collection(recreate=True)` in the pipeline. Collection creation does not happen at import time.
- HuggingFace models are loaded lazily. If you are offline, you must have the embedding model already available in your local HF cache.
