"""App settings loaded from environment variables.

We use `pydantic-settings` so local development can rely on a `.env` file.
All fields have safe defaults so importing modules does not crash; the server
decides at runtime which features are enabled based on these values.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Dashboard integration (optional; failures should not crash the server).
    AGENT_ID: str = ""
    DASHBOARD_URL: str = ""

    # Dynamic mode: generate tools from an OpenAPI spec.
    OPENAPI_URL: str = ""
    API_BASE_URL: str = ""
    IS_DYNAMIC_ENABLED: bool = False

    # Static mode: scrape + index into Qdrant, and enable retrieval tool.
    SCRAPING_URL: str = ""
    IS_STATIC_ENABLED: bool = True

    # Query expansion (LLM-generated variants) for hybrid retrieval.
    QUERY_EXPANSION_ENABLED: bool = False
    QUERY_EXPANSION_NUM_QUERIES: int = 4

    # Model/config knobs.
    OPENAI_API_KEY: str = ""
    EMBED_MODEL_NAME: str = "BAAI/bge-base-en-v1.5"

    # Qdrant configuration.
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = "latest"

    # Where crawlee writes scraped JSON pages (and __metadata__.json).
    SCRAPE_STORAGE_DIR: str = "./scrape/storage"
    SCRAPE_DATASET_DIR: str = "./scrape/storage/datasets/default"


settings = Settings()
