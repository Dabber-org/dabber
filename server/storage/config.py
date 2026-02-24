"""Storage-specific settings loaded from environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parent.parent


class StorageSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(SERVER_ROOT / ".env"), extra="ignore")

    AGENT_ID: str = ""

    # Qdrant configuration.
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = ""


storage_settings = StorageSettings()
storage_settings.QDRANT_COLLECTION_NAME = storage_settings.AGENT_ID
