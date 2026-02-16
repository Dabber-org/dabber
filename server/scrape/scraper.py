from __future__ import annotations

"""Simple Firecrawl-backed scraping pipeline.

This module starts a Firecrawl crawl job, polls for completed pages, and writes
page-level JSON records to `settings.SCRAPE_DATASET_DIR`.
"""

import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import requests
from bs4 import BeautifulSoup

from settings import settings

logger = logging.getLogger(__name__)


FIRECRAWL_BASE_URL_ENV = "FIRECRAWL_BASE_URL"
FIRECRAWL_API_KEY_ENV = "FIRECRAWL_API_KEY"
ENV_FILE_PATH = Path(__file__).resolve().parents[1] / ".env"


def _strip_env_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def _read_env_file_value(key: str) -> str:
    if not ENV_FILE_PATH.exists():
        return ""

    try:
        lines = ENV_FILE_PATH.read_text(encoding="utf-8").splitlines()
    except OSError:
        return ""

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        if line.startswith("export "):
            line = line[len("export ") :].strip()
            if "=" not in line:
                continue

        k, v = line.split("=", 1)
        if k.strip() == key:
            return _strip_env_quotes(v.strip())

    return ""


def _resolve_env_value(key: str) -> str:
    return os.getenv(key, "").strip() or _read_env_file_value(key).strip()


class WebScraper:
    """Crawler that starts Firecrawl via POST using server URL from `.env`."""

    TERMINAL_STATES = {"completed", "failed", "cancelled"}

    def __init__(
        self,
        start_url: str,
        max_requests: int = 1000,
        min_content_length: int = 100,
        firecrawl_base_url: str | None = None,
        firecrawl_api_key: str | None = None,
        poll_interval_seconds: float = 2.0,
        timeout_seconds: float = 30.0,
        max_wait_seconds: int = 1800,
        stream_batch_size: int = 50,
    ) -> None:
        self.start_url = start_url
        self.max_requests = max_requests
        self.min_content_length = min_content_length

        resolved_base_url = (
            firecrawl_base_url.strip()
            if isinstance(firecrawl_base_url, str)
            else _resolve_env_value(FIRECRAWL_BASE_URL_ENV)
        )
        if not resolved_base_url:
            raise RuntimeError(
                f"{FIRECRAWL_BASE_URL_ENV} is required in {ENV_FILE_PATH} or environment."
            )

        self.firecrawl_base_url = resolved_base_url.rstrip("/")
        self.firecrawl_api_key = (
            firecrawl_api_key.strip()
            if isinstance(firecrawl_api_key, str)
            else _resolve_env_value(FIRECRAWL_API_KEY_ENV)
        )

        self.poll_interval_seconds = max(0.25, poll_interval_seconds)
        self.timeout_seconds = timeout_seconds
        self.max_wait_seconds = max_wait_seconds
        self.stream_batch_size = max(1, stream_batch_size)

    async def run(self) -> None:
        await asyncio.to_thread(self._run_sync)

    def _run_sync(self) -> None:
        logger.info("Starting Firecrawl crawl for %s", self.start_url)
        job_id = self._start_crawl()
        docs = self._collect_documents(job_id)
        page_records = self._transform_documents(docs)
        self._write_dataset(page_records)
        logger.info("Firecrawl crawl complete. Stored %s page records.", len(page_records))

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.firecrawl_api_key:
            headers["Authorization"] = f"Bearer {self.firecrawl_api_key}"
        return headers

    def _request_json(self, response: requests.Response) -> dict[str, Any]:
        try:
            return response.json()
        except Exception:
            return {"success": False, "error": response.text}

    def _start_crawl(self) -> str:
        endpoint = f"{self.firecrawl_base_url}/v2/crawl"
        payload = {
            "url": self.start_url,
            "limit": self.max_requests,
            "scrapeOptions": {"formats": ["markdown", "html"]},
        }
        response = requests.post(
            endpoint,
            headers=self._headers(),
            json=payload,
            timeout=self.timeout_seconds,
        )
        data = self._request_json(response)
        if response.status_code >= 400:
            raise RuntimeError(f"Failed to start crawl [{response.status_code}]: {data}")

        job_id = data.get("id")
        if not isinstance(job_id, str) or not job_id:
            raise RuntimeError(f"Crawl did not return a valid job id: {data}")

        logger.info("Started Firecrawl job %s", job_id)
        return job_id

    def _next_skip_from_next(self, next_url: Any) -> int | None:
        if not isinstance(next_url, str) or not next_url:
            return None
        try:
            query = parse_qs(urlparse(next_url).query)
            values = query.get("skip")
            if not values:
                return None
            return max(0, int(values[0]))
        except Exception:
            return None

    def _status(self, job_id: str, skip: int, limit: int) -> dict[str, Any]:
        endpoint = f"{self.firecrawl_base_url}/v2/crawl/{job_id}"
        response = requests.get(
            endpoint,
            headers=self._headers(),
            params={"skip": skip, "limit": limit},
            timeout=self.timeout_seconds,
        )
        data = self._request_json(response)
        if response.status_code >= 400:
            raise RuntimeError(f"Failed to get crawl status [{response.status_code}]: {data}")
        return data

    def _collect_documents(self, job_id: str) -> list[dict[str, Any]]:
        deadline = time.monotonic() + self.max_wait_seconds
        cursor = 0
        docs: list[dict[str, Any]] = []
        final_total: int | None = None

        while True:
            if time.monotonic() > deadline:
                raise TimeoutError(f"Crawl timed out after {self.max_wait_seconds}s: {job_id}")

            data = self._status(job_id, skip=cursor, limit=self.stream_batch_size)
            status = str(data.get("status", "unknown")).lower()
            completed = data.get("completed")
            total = data.get("total")
            if isinstance(total, int):
                final_total = total

            page_batch = data.get("data")
            if isinstance(page_batch, list):
                docs.extend(x for x in page_batch if isinstance(x, dict))

            logger.info("Crawl status=%s completed=%s/%s", status, completed, total)

            next_skip = self._next_skip_from_next(data.get("next"))
            if next_skip is not None:
                cursor = max(cursor, next_skip)
            elif isinstance(page_batch, list):
                cursor += len(page_batch)

            if status in self.TERMINAL_STATES:
                break

            time.sleep(self.poll_interval_seconds)

        if isinstance(final_total, int):
            while cursor < final_total:
                data = self._status(job_id, skip=cursor, limit=self.stream_batch_size)
                page_batch = data.get("data")
                if not isinstance(page_batch, list) or not page_batch:
                    break
                docs.extend(x for x in page_batch if isinstance(x, dict))
                next_skip = self._next_skip_from_next(data.get("next"))
                if next_skip is not None:
                    cursor = max(cursor, next_skip)
                else:
                    cursor += len(page_batch)

        return docs

    def _compact(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    def _extract_text(self, doc: dict[str, Any]) -> str:
        markdown = doc.get("markdown")
        if isinstance(markdown, str) and markdown.strip():
            return self._compact(markdown)

        summary = doc.get("summary")
        if isinstance(summary, str) and summary.strip():
            return self._compact(summary)

        html = doc.get("html")
        if isinstance(html, str) and html.strip():
            soup = BeautifulSoup(html, "lxml")
            return self._compact(soup.get_text(separator=" ", strip=True))

        raw_html = doc.get("rawHtml")
        if isinstance(raw_html, str) and raw_html.strip():
            soup = BeautifulSoup(raw_html, "lxml")
            return self._compact(soup.get_text(separator=" ", strip=True))

        extracted = doc.get("extract")
        if extracted is not None:
            return self._compact(json.dumps(extracted, ensure_ascii=False))

        return ""

    def _extract_url_title(self, doc: dict[str, Any]) -> tuple[str, str]:
        metadata = doc.get("metadata")
        url = ""
        title = ""

        if isinstance(metadata, dict):
            source_url = metadata.get("sourceURL")
            if isinstance(source_url, str):
                url = source_url
            elif isinstance(metadata.get("url"), str):
                url = metadata["url"]

            if isinstance(metadata.get("title"), str):
                title = metadata["title"]

        if not url and isinstance(doc.get("url"), str):
            url = doc["url"]
        if not title and isinstance(doc.get("title"), str):
            title = doc["title"]

        return url, title

    def _transform_documents(self, docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        seen: set[tuple[str, str]] = set()

        for doc in docs:
            text = self._extract_text(doc)
            if len(text) < self.min_content_length:
                continue

            url, title = self._extract_url_title(doc)
            key = (url.strip().lower(), text[:256])
            if key in seen:
                continue
            seen.add(key)

            records.append(
                {
                    "url": url,
                    "title": title,
                    "text": text,
                    "word_count": len(text.split()),
                    "char_count": len(text),
                }
            )

        return records

    def _write_dataset(self, records: list[dict[str, Any]]) -> None:
        dataset_dir = Path(settings.SCRAPE_DATASET_DIR).resolve()
        dataset_dir.mkdir(parents=True, exist_ok=True)

        for existing in dataset_dir.glob("*.json"):
            existing.unlink(missing_ok=True)

        for idx, record in enumerate(records):
            output_path = dataset_dir / f"{idx:09d}.json"
            output_path.write_text(
                json.dumps(record, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

        metadata = {
            "source": "firecrawl",
            "count": len(records),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        (dataset_dir / "__metadata__.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


async def scrape_website() -> None:
    """Scrape the configured site by delegating crawl work to Firecrawl."""
    scraper = WebScraper(
        start_url=settings.SCRAPING_URL,
        max_requests=1000,
        min_content_length=100,
    )
    await scraper.run()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    asyncio.run(scrape_website())
