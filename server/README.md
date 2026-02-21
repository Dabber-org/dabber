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

### Static startup behavior (`RESCRAPE`)
- `RESCRAPE=false`:
  - First run (no Qdrant collection): scrape + embed.
  - Restart with existing collection and local scraped files: skip scrape/embed and reuse existing index.
  - Existing collection but missing local scraped files: automatic recovery rebuild (scrape + embed).
- `RESCRAPE=true`:
  - Always force full rebuild on startup (clear collection, scrape, embed).

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
- `RESCRAPE`: startup ingest policy (`false` by default; set `true` to force rebuild every start)
- `SCRAPE_STORAGE_DIR`: default `./scrape/storage`
- `SCRAPE_DATASET_DIR`: default `./scrape/storage/datasets/default`
- `EMBED_MODEL_NAME`: default `BAAI/bge-base-en-v1.5`
- `QUERY_EXPANSION_ENABLED`: enable LLM query expansion for hybrid retrieval (default `false`, requires an LLM configuration; OpenAI by default)
- `QUERY_EXPANSION_NUM_QUERIES`: number of expanded queries when enabled (default `4`)
- `RETRIEVAL_N_RESULTS_DEFAULT`: default final results returned by `vector_db` (default `8`)
- `RETRIEVAL_MAX_CHARS_DEFAULT`: snippet/compressed char budget per result (default `2000`)
- `RETRIEVAL_SEMANTIC_TOP_K_DEFAULT`: semantic candidate pool size for the initial pass (default `36`)
- `RETRIEVAL_LEXICAL_TOP_K_DEFAULT`: BM25 candidate pool size for the initial pass (default `36`)
- `RETRIEVAL_COMPRESS_PERCENTILE_DEFAULT`: sentence compression keep-rate for long docs (default `0.2`)
- `RETRIEVAL_CONTEXT_BEFORE_DEFAULT`: neighbor sentences before selected sentence (default `1`)
- `RETRIEVAL_CONTEXT_AFTER_DEFAULT`: neighbor sentences after selected sentence (default `1`)
- `RETRIEVAL_METADATA_RANK_BOOST_DEFAULT`: metadata relevance boost strength (default `0.35`)
- `RETRIEVAL_ADAPTIVE_ENABLED`: enable confidence-based escalation from cheap pass to deep pass (default `true`)
- `RETRIEVAL_ESCALATION_SEMANTIC_TOP_K`: semantic top-k used when escalation triggers (default `80`)
- `RETRIEVAL_ESCALATION_LEXICAL_TOP_K`: BM25 top-k used when escalation triggers (default `80`)
- `RETRIEVAL_MIN_CONFIDENCE_TO_SKIP_ESCALATION`: confidence threshold for staying on cheap pass (default `0.65`)
- `RETRIEVAL_MAX_COMPRESSED_RESULTS`: max long pages per query that run sentence compression (default `3`)
- `RETRIEVAL_MIN_SNIPPET_QUERY_COVERAGE`: minimum snippet query-token coverage before skipping extra compression (default `0.35`)
- `RETRIEVAL_RULE_BASED_QUERY_EXPANSION_ENABLED`: enable zero-cost synonym expansion for retrieval query (default `true`)

## Notes / Troubleshooting

- Qdrant collection creation/deletion is explicit in the static startup strategy. Collection creation does not happen at import time.
- HuggingFace models are loaded lazily. If you are offline, you must have the embedding model already available in your local HF cache.
