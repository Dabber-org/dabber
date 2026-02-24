"""Core app settings loaded from environment variables.

This module is the canonical env template for server-wide runtime settings.
Feature-specific settings (for example retrieval tuning) live in their own
modules so each subsystem can own its env schema independently.
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(SERVER_ROOT / ".env"), extra="ignore")

    # Dashboard integration (optional; failures should not crash the server).
    AGENT_ID: str = ""
    DASHBOARD_URL: str = ""

    # Dynamic mode: generate tools from an OpenAPI spec.
    OPENAPI_URL: str = ""
    API_BASE_URL: str = ""
    IS_DYNAMIC_ENABLED: bool = False

    # Static mode: scrape + index into Qdrant, and enable retrieval tool.
    SCRAPING_URL: str = ""
    FIRECRAWL_BASE_URL: str = "http://localhost:3002"
    IS_STATIC_ENABLED: bool = True
    # RESCRAPE startup behavior:
    # - false: first-run ingest, restart reuse existing index.
    # - true: force full rebuild (scrape + embed) on every startup.
    RESCRAPE: bool = False

    # Model/config knobs.
    OPENAI_API_KEY: str = ""


settings = Settings()
