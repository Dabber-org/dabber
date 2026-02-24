"""Pipeline/indexing-specific settings loaded from environment variables."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parent.parent


def _resolve_server_path(value: str) -> str:
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = SERVER_ROOT / path
    return str(path.resolve())


class PipelineSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(SERVER_ROOT / ".env"), extra="ignore")

    # Model/config knobs for indexing.
    EMBED_MODEL_NAME: str = "BAAI/bge-base-en-v1.5"
    # Console progress bars for indexing; disable by default to avoid interleaved
    # output with async HTTP logs in long-running ingestion.
    INDEX_SHOW_PROGRESS: bool = False

    # Where crawlee writes scraped JSON pages (and __metadata__.json).
    SCRAPE_STORAGE_DIR: str = "./scrape/storage"
    SCRAPE_DATASET_DIR: str = "./scrape/storage/datasets/default"


pipeline_settings = PipelineSettings()
pipeline_settings.SCRAPE_STORAGE_DIR = _resolve_server_path(
    pipeline_settings.SCRAPE_STORAGE_DIR
)
pipeline_settings.SCRAPE_DATASET_DIR = _resolve_server_path(
    pipeline_settings.SCRAPE_DATASET_DIR
)
