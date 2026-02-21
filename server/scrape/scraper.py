from __future__ import annotations

"""Firecrawl crawler with subtree scope and streamed dataset writes."""

import asyncio
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse, urlunparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from settings import settings

TERMINAL_STATES = {"completed", "failed", "cancelled"}
RETRY_STATUS_CODES = (429, 500, 502, 503, 504)


def _read_json(response: requests.Response) -> dict[str, Any]:
    response.raise_for_status()
    try:
        body = response.json()
    except ValueError as exc:
        raise RuntimeError(
            f"Expected JSON response from Firecrawl, got: {response.text[:300]}"
        ) from exc
    return body if isinstance(body, dict) else {}


def _next_skip(next_url: object) -> int | None:
    if not isinstance(next_url, str) or not next_url:
        return None
    try:
        values = parse_qs(urlparse(next_url).query).get("skip")
        if not values:
            return None
        return max(0, int(values[0]))
    except Exception:
        return None


def _env_int(
    name: str, default: int, *, minimum: int = 0, maximum: int | None = None
) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    if value < minimum:
        value = minimum
    if maximum is not None and value > maximum:
        value = maximum
    return value


def _env_float(
    name: str, default: float, *, minimum: float = 0.0, maximum: float | None = None
) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    if value < minimum:
        value = minimum
    if maximum is not None and value > maximum:
        value = maximum
    return value


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    if raw in {"1", "true", "t", "yes", "y", "on"}:
        return True
    if raw in {"0", "false", "f", "no", "n", "off"}:
        return False
    return default


def _to_non_negative_int(value: Any, default: int = 0) -> int:
    try:
        return max(0, int(value))
    except Exception:
        return default


def _clean_text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _clean_url_candidate(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    cleaned = value.strip()
    if not cleaned:
        return ""
    if cleaned.lower() in {"null", "none", "undefined"}:
        return ""
    return cleaned


def _as_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if isinstance(item, str):
            cleaned = item.strip()
            if cleaned:
                items.append(cleaned)
        elif item is not None:
            items.append(str(item))
    return items


def _first_non_empty_text(values: list[Any]) -> str:
    for value in values:
        text = _clean_text(value)
        if text:
            return text
    return ""


def _prepare_output_dir(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_file in output_dir.glob("*.json"):
        old_file.unlink(missing_ok=True)


def _build_session(api_key: str) -> tuple[requests.Session, dict[str, str]]:
    session = requests.Session()
    retry = Retry(
        total=5,
        connect=5,
        read=5,
        backoff_factor=1.0,
        status_forcelist=RETRY_STATUS_CODES,
        allowed_methods=frozenset({"GET", "POST"}),
        raise_on_status=False,
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return session, headers


def _normalize_subtree_path(path: str) -> str:
    normalized = path or "/"
    if not normalized.startswith("/"):
        normalized = f"/{normalized}"
    normalized = re.sub(r"/+", "/", normalized)
    if normalized != "/" and normalized.endswith("/"):
        normalized = normalized.rstrip("/")
    return normalized


def _regex_literal_case_insensitive(path: str) -> str:
    parts: list[str] = []
    for ch in path:
        if ch.isalpha():
            parts.append(f"[{ch.lower()}{ch.upper()}]")
        else:
            parts.append(re.escape(ch))
    return "".join(parts)


def _build_subtree_include_pattern(target_url: str) -> str:
    parsed = urlparse(target_url)
    path = _normalize_subtree_path(parsed.path)
    if path == "/":
        return r"^/.*"
    return rf"^{_regex_literal_case_insensitive(path)}(?:$|/.*)"


def _canonical_url(url: str) -> str:
    value = url.strip()
    if not value:
        return value

    parsed = urlparse(value)
    if not parsed.scheme or not parsed.netloc:
        return value

    normalized = parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=parsed.netloc.lower(),
        fragment="",
    )
    return urlunparse(normalized)


def _crawl_config() -> dict[str, Any]:
    target_url = settings.SCRAPING_URL.strip()
    firecrawl_base_url = settings.FIRECRAWL_BASE_URL.strip().rstrip("/")

    if not target_url:
        raise RuntimeError("Set SCRAPING_URL in server/.env")
    if not firecrawl_base_url:
        raise RuntimeError("Set FIRECRAWL_BASE_URL in server/.env")

    return {
        "target_url": target_url,
        "firecrawl_base_url": firecrawl_base_url,
        "output_dir": Path(settings.SCRAPE_DATASET_DIR).resolve(),
        "api_key": os.getenv("FIRECRAWL_API_KEY", "").strip(),
        "stream_batch_size": _env_int(
            "SCRAPE_STREAM_BATCH_SIZE", 500, minimum=1, maximum=5000
        ),
        "crawl_limit": _env_int("SCRAPE_CRAWL_LIMIT", 10000, minimum=1),
        "http_timeout_seconds": _env_float(
            "SCRAPE_HTTP_TIMEOUT_SECONDS", 30.0, minimum=1.0
        ),
        "poll_interval_seconds": _env_float(
            "SCRAPE_POLL_INTERVAL_SECONDS", 2.0, minimum=0.2
        ),
        "max_wait_seconds": _env_int(
            "SCRAPE_MAX_WAIT_SECONDS", 3600, minimum=30, maximum=86400
        ),
        "max_discovery_depth": _env_int(
            "SCRAPE_MAX_DISCOVERY_DEPTH", 25, minimum=1, maximum=1000
        ),
        "ignore_robots_txt": _env_bool("SCRAPE_IGNORE_ROBOTS_TXT", False),
    }


def _build_crawl_payload(config: dict[str, Any]) -> dict[str, Any]:
    include_pattern = _build_subtree_include_pattern(config["target_url"])
    return {
        "url": config["target_url"],
        "limit": config["crawl_limit"],
        "includePaths": [include_pattern],
        "allowSubdomains": False,
        "allowExternalLinks": False,
        # Keep crawling restricted by includePaths, but allow traversal to discover
        # all matching pages even when site links vary in casing/structure.
        "crawlEntireDomain": True,
        "maxDiscoveryDepth": config["max_discovery_depth"],
        "sitemap": "include",
        "deduplicateSimilarURLs": False,
        "ignoreQueryParameters": True,
        "ignoreRobotsTxt": config["ignore_robots_txt"],
        "scrapeOptions": {
            "formats": ["markdown", "html", "rawHtml", "links"],
            "onlyMainContent": False,
            "parsers": ["pdf"],
        },
    }


def _start_crawl(
    session: requests.Session,
    base_url: str,
    headers: dict[str, str],
    timeout_seconds: float,
    payload: dict[str, Any],
) -> str:
    response = session.post(
        f"{base_url}/v2/crawl",
        headers=headers,
        json=payload,
        timeout=timeout_seconds,
    )
    data = _read_json(response)
    job_id = data.get("id")
    if not isinstance(job_id, str) or not job_id:
        raise RuntimeError(f"Crawl start failed: {data}")
    return job_id


def _get_crawl_status(
    session: requests.Session,
    base_url: str,
    headers: dict[str, str],
    timeout_seconds: float,
    job_id: str,
) -> dict[str, Any]:
    response = session.get(
        f"{base_url}/v2/crawl/{job_id}",
        headers=headers,
        timeout=timeout_seconds,
    )
    return _read_json(response)


def _fetch_batch(
    session: requests.Session,
    base_url: str,
    headers: dict[str, str],
    timeout_seconds: float,
    job_id: str,
    skip: int,
    limit: int,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    response = session.get(
        f"{base_url}/v2/crawl/{job_id}",
        headers=headers,
        params={"skip": skip, "limit": limit},
        timeout=timeout_seconds,
    )
    payload = _read_json(response)
    raw_batch = payload.get("data")
    if not isinstance(raw_batch, list):
        return [], payload
    return [doc for doc in raw_batch if isinstance(doc, dict)], payload


def _fetch_crawl_errors(
    session: requests.Session,
    base_url: str,
    headers: dict[str, str],
    timeout_seconds: float,
    job_id: str,
) -> dict[str, Any]:
    try:
        response = session.get(
            f"{base_url}/v2/crawl/{job_id}/errors",
            headers=headers,
            timeout=timeout_seconds,
        )
        return _read_json(response)
    except Exception as exc:
        return {"error": f"Unable to fetch crawl errors: {exc}"}


def _condensed_errors(payload: dict[str, Any]) -> dict[str, Any]:
    condensed: dict[str, Any] = {}
    errors = payload.get("errors")
    if isinstance(errors, list):
        sample: list[dict[str, Any]] = []
        for item in errors[:5]:
            if isinstance(item, dict):
                sample.append(
                    {
                        "url": item.get("url"),
                        "code": item.get("code"),
                        "error": item.get("error"),
                    }
                )
        condensed["errors"] = sample
        condensed["errors_total"] = len(errors)

    robots_blocked = payload.get("robotsBlocked")
    if isinstance(robots_blocked, list):
        condensed["robots_blocked_total"] = len(robots_blocked)
        condensed["robots_blocked_sample"] = robots_blocked[:5]

    if not condensed:
        condensed["raw"] = payload
    return condensed


def _normalize_doc(
    doc: dict[str, Any],
    *,
    target_url: str,
    crawl_id: str,
    retrieved_at: str,
) -> dict[str, Any]:
    metadata = doc.get("metadata") if isinstance(doc.get("metadata"), dict) else {}

    markdown = _clean_text(doc.get("markdown"))
    html = _clean_text(doc.get("html"))
    raw_html = _clean_text(doc.get("rawHtml"))
    summary = _clean_text(doc.get("summary"))
    links = _as_string_list(doc.get("links"))
    images = _as_string_list(doc.get("images"))

    text = _first_non_empty_text([markdown, html, raw_html, summary])
    if not text:
        text = json.dumps(doc, ensure_ascii=False)

    page_url = (
        _clean_url_candidate(metadata.get("sourceURL"))
        or _clean_url_candidate(metadata.get("url"))
        or _clean_url_candidate(doc.get("url"))
        or target_url
    )
    title = str(metadata.get("title") or doc.get("title") or page_url)
    parsed = urlparse(page_url)
    meta_filters: dict[str, Any] = {
        "url": page_url,
        "title": title,
        "source_host": parsed.netloc.lower() if parsed.netloc else "",
        "source_path": parsed.path or "/",
    }
    if isinstance(metadata.get("statusCode"), int):
        meta_filters["status_code"] = metadata.get("statusCode")
    if isinstance(metadata.get("language"), str):
        meta_filters["language"] = metadata.get("language")
    if isinstance(metadata.get("contentType"), str):
        meta_filters["content_type"] = metadata.get("contentType")

    return {
        # Backward-compatible fields consumed by current pipeline.
        "url": page_url,
        "title": title,
        "text": text,
        "word_count": len(text.split()),
        "char_count": len(text),
        # Richer RAG/debug fields.
        "crawl_id": crawl_id,
        "retrieved_at": retrieved_at,
        "markdown": markdown,
        "html": html,
        "raw_html": raw_html,
        "summary": summary,
        "links": links,
        "images": images,
        "meta_filters": meta_filters,
        "firecrawl_metadata": metadata,
        "raw_document": doc,
    }


def _write_page(output_dir: Path, index: int, page: dict[str, Any]) -> None:
    (output_dir / f"{index:09d}.json").write_text(
        json.dumps(page, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _write_metadata(output_dir: Path, metadata: dict[str, Any]) -> None:
    (output_dir / "__metadata__.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _persist_batch(
    *,
    output_dir: Path,
    docs: list[dict[str, Any]],
    seen_urls: set[str],
    next_index: int,
    duplicates_skipped: int,
    target_url: str,
    crawl_id: str,
) -> tuple[int, int]:
    retrieved_at = datetime.now(timezone.utc).isoformat()
    for doc in docs:
        page = _normalize_doc(
            doc,
            target_url=target_url,
            crawl_id=crawl_id,
            retrieved_at=retrieved_at,
        )
        canonical = _canonical_url(str(page.get("url", "")))
        if canonical and canonical in seen_urls:
            duplicates_skipped += 1
            continue
        if canonical:
            seen_urls.add(canonical)
        _write_page(output_dir, next_index, page)
        next_index += 1
    return next_index, duplicates_skipped


def _advance_skip(current_skip: int, payload: dict[str, Any], docs_len: int) -> int:
    suggested = _next_skip(payload.get("next"))
    if suggested is not None and suggested > current_skip:
        return suggested
    return current_skip + docs_len


def _crawl_once() -> None:
    config = _crawl_config()
    payload = _build_crawl_payload(config)
    output_dir = Path(config["output_dir"])
    _prepare_output_dir(output_dir)

    session, headers = _build_session(config["api_key"])
    job_id = ""
    status = "not_started"
    downloaded_count = 0
    next_file_index = 0
    duplicates_skipped = 0
    seen_urls: set[str] = set()
    error_message = ""

    try:
        job_id = _start_crawl(
            session=session,
            base_url=config["firecrawl_base_url"],
            headers=headers,
            timeout_seconds=config["http_timeout_seconds"],
            payload=payload,
        )

        deadline = time.monotonic() + config["max_wait_seconds"]
        while status not in TERMINAL_STATES:
            if time.monotonic() > deadline:
                raise TimeoutError(
                    f"Crawl {job_id} timed out after {config['max_wait_seconds']}s."
                )

            status_data = _get_crawl_status(
                session=session,
                base_url=config["firecrawl_base_url"],
                headers=headers,
                timeout_seconds=config["http_timeout_seconds"],
                job_id=job_id,
            )
            status = str(status_data.get("status", "unknown")).lower()
            completed = _to_non_negative_int(status_data.get("completed"), default=0)

            # Stream pages in configured windows while crawl is running.
            while (
                status not in TERMINAL_STATES
                and completed - downloaded_count >= config["stream_batch_size"]
            ):
                docs, batch_payload = _fetch_batch(
                    session=session,
                    base_url=config["firecrawl_base_url"],
                    headers=headers,
                    timeout_seconds=config["http_timeout_seconds"],
                    job_id=job_id,
                    skip=downloaded_count,
                    limit=config["stream_batch_size"],
                )
                if not docs:
                    break

                next_file_index, duplicates_skipped = _persist_batch(
                    output_dir=output_dir,
                    docs=docs,
                    seen_urls=seen_urls,
                    next_index=next_file_index,
                    duplicates_skipped=duplicates_skipped,
                    target_url=config["target_url"],
                    crawl_id=job_id,
                )

                next_skip = _advance_skip(
                    current_skip=downloaded_count,
                    payload=batch_payload,
                    docs_len=len(docs),
                )
                if next_skip <= downloaded_count:
                    break
                downloaded_count = next_skip

            if status in TERMINAL_STATES:
                break
            time.sleep(config["poll_interval_seconds"])

        if status == "completed":
            # Final drain for all remaining pages after completion.
            while True:
                docs, batch_payload = _fetch_batch(
                    session=session,
                    base_url=config["firecrawl_base_url"],
                    headers=headers,
                    timeout_seconds=config["http_timeout_seconds"],
                    job_id=job_id,
                    skip=downloaded_count,
                    limit=config["stream_batch_size"],
                )
                if not docs:
                    break

                next_file_index, duplicates_skipped = _persist_batch(
                    output_dir=output_dir,
                    docs=docs,
                    seen_urls=seen_urls,
                    next_index=next_file_index,
                    duplicates_skipped=duplicates_skipped,
                    target_url=config["target_url"],
                    crawl_id=job_id,
                )

                next_skip = _advance_skip(
                    current_skip=downloaded_count,
                    payload=batch_payload,
                    docs_len=len(docs),
                )
                if next_skip <= downloaded_count:
                    break
                downloaded_count = next_skip
        else:
            errors_payload = _fetch_crawl_errors(
                session=session,
                base_url=config["firecrawl_base_url"],
                headers=headers,
                timeout_seconds=config["http_timeout_seconds"],
                job_id=job_id,
            )
            raise RuntimeError(
                f"Crawl {job_id} ended with status '{status}'. "
                f"Errors: {_condensed_errors(errors_payload)}"
            )
    except Exception as exc:
        error_message = str(exc)
        raise
    finally:
        metadata = {
            "source": "firecrawl-crawl",
            "crawl_id": job_id,
            "root_url": config["target_url"],
            "status": status,
            "count": next_file_index,
            "duplicates_skipped": duplicates_skipped,
            "downloaded_count": downloaded_count,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "options": {
                "stream_batch_size": config["stream_batch_size"],
                "crawl_limit": config["crawl_limit"],
                "max_discovery_depth": config["max_discovery_depth"],
                "ignore_robots_txt": config["ignore_robots_txt"],
                "include_paths": payload.get("includePaths", []),
                "allow_subdomains": False,
                "allow_external_links": False,
                "crawl_entire_domain": True,
                "sitemap": "include",
                "deduplicate_similar_urls": False,
                "ignore_query_parameters": True,
                "scrape_formats": ["markdown", "html", "rawHtml", "links"],
            },
        }
        if error_message:
            metadata["error"] = error_message
        _write_metadata(output_dir, metadata)
        session.close()


async def scrape_website() -> None:
    await asyncio.to_thread(_crawl_once)


if __name__ == "__main__":
    asyncio.run(scrape_website())
