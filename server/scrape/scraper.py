from __future__ import annotations

"""Web scraping pipeline using Crawlee + Playwright.

This scrapes a site starting from `settings.SCRAPING_URL` and writes page-level
JSON records to `settings.SCRAPE_STORAGE_DIR` (Crawlee storage layout).

Output (dataset files) is later indexed by LlamaIndex for page-level retrieval.
"""

import asyncio
import logging
from contextlib import suppress
from pathlib import Path
from typing import Optional, Set
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from crawlee import ConcurrencySettings, service_locator
from crawlee.configuration import Configuration
from crawlee.crawlers import (
    PlaywrightCrawler,
    PlaywrightCrawlingContext,
    PlaywrightPreNavCrawlingContext,
)
from crawlee.errors import ServiceConflictError
from crawlee.events import LocalEventManager
from crawlee.storage_clients import FileSystemStorageClient
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import Page

from settings import settings

logger = logging.getLogger(__name__)


class WebScraper:
    """Production-grade web scraper with URL filtering and error handling."""

    DISALLOWED_EXTENSIONS = frozenset(
        [
            ".pdf",
            ".zip",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".ppt",
            ".pptx",
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".mp4",
            ".mp3",
            ".avi",
            ".mov",
            ".exe",
            ".dmg",
        ]
    )

    SKIP_PATTERNS = frozenset(
        [
            "/_layouts/15/Authenticate.aspx",
            "/auth/",
            "/login",
            "/logout",
            "/signin",
            "/signout",
        ]
    )

    INVALID_HREF_PREFIXES = frozenset(["javascript:", "mailto:", "tel:", "sms:", "data:", "ftp:"])
    INVALID_HREF_VALUES = frozenset(["#", "javascript:void(0)", "javascript:void(0);", "null", "undefined", ""])

    def __init__(
        self,
        start_url: str,
        max_requests: int = 10_000,
        max_concurrency: int = 50,
        min_content_length: int = 100,
    ) -> None:
        self.start_url = start_url
        self.max_requests = max_requests
        self.max_concurrency = max_concurrency
        self.min_content_length = min_content_length

        self._setup_url_constraints()
        self._visited_urls: Set[str] = set()

        logger.info("Initialized scraper for %s", start_url)

    def _setup_url_constraints(self) -> None:
        parsed = urlparse(self.start_url)
        self.allowed_scheme = (parsed.scheme or "").lower()
        self.allowed_netloc = parsed.netloc.lower()

        path = parsed.path.rstrip("/") or "/"
        self.allowed_prefix = path if path.endswith("/") else f"{path}/"
        self.allowed_prefix_lower = self.allowed_prefix.lower()

    def _configure_storage(self) -> Configuration:
        storage_dir = Path(settings.SCRAPE_STORAGE_DIR).resolve()
        storage_dir.mkdir(parents=True, exist_ok=True)

        config = Configuration(purge_on_start=True, storage_dir=str(storage_dir))

        with suppress(ServiceConflictError):
            service_locator.set_configuration(config)

        if service_locator.get_configuration() != config:
            config = Configuration.get_global_configuration()
            config.purge_on_start = True
            config.storage_dir = str(storage_dir)

        with suppress(ServiceConflictError):
            service_locator.set_storage_client(FileSystemStorageClient())

        with suppress(ServiceConflictError):
            service_locator.set_event_manager(LocalEventManager.from_config(config))

        logger.info("Storage configured at: %s", storage_dir)
        return config

    def is_valid_url(self, url: str) -> bool:
        if not url or len(url) > 2000:
            return False

        url_lower = url.lower()
        if any(url_lower.endswith(ext) for ext in self.DISALLOWED_EXTENSIONS):
            return False
        if any(pattern in url for pattern in self.SKIP_PATTERNS):
            return False

        try:
            parsed = urlparse(url)
        except (ValueError, AttributeError):
            return False

        scheme = (parsed.scheme or "").lower()
        netloc = parsed.netloc.lower()
        if scheme != self.allowed_scheme or netloc != self.allowed_netloc:
            return False

        path = parsed.path or "/"
        normalized_path = path if path.endswith("/") else f"{path}/"
        return normalized_path.lower().startswith(self.allowed_prefix_lower)

    async def _optimize_page_load(self, page: Page) -> None:
        async def route_handler(route):
            try:
                if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
                    await route.abort()
                else:
                    await route.continue_()
            except PlaywrightError:
                pass

        try:
            await page.route("**/*", route_handler)
            await page.set_viewport_size({"width": 1280, "height": 720})
        except PlaywrightError as e:
            logger.warning("Failed to optimize page load: %s", e)

    async def _extract_links(self, html: str, base_url: str) -> list[str]:
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception as e:
            logger.error("Failed to parse HTML: %s", e)
            return []

        links: list[str] = []
        for anchor in soup.find_all("a", href=True):
            try:
                raw_href = anchor["href"].strip()
                if not raw_href:
                    continue

                href_lower = raw_href.lower()
                if href_lower in self.INVALID_HREF_VALUES:
                    continue
                if any(href_lower.startswith(prefix) for prefix in self.INVALID_HREF_PREFIXES):
                    continue
                if "undefined" in href_lower or "null" in href_lower:
                    continue

                absolute_url = urljoin(base_url, raw_href)
                absolute_url = absolute_url.split("#")[0].rstrip("/")
                canonical_url = absolute_url.lower()

                if canonical_url not in self._visited_urls and self.is_valid_url(absolute_url):
                    links.append(absolute_url)
                    self._visited_urls.add(canonical_url)
            except (ValueError, AttributeError, TypeError):
                continue

        return links

    async def _extract_content(self, html: str, url: str) -> Optional[dict]:
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception as e:
            logger.error("Failed to parse HTML from %s: %s", url, e)
            return None

        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            h1 = soup.find("h1")
            title = h1.get_text(strip=True) if h1 else ""

        for element in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
            element.decompose()

        text = soup.get_text(separator=" ", strip=True)
        text = " ".join(text.split())

        if len(text) < self.min_content_length:
            return None

        word_count = len(text.split())
        return {
            "url": url,
            "title": title,
            "text": text,
            "word_count": word_count,
            "char_count": len(text),
        }

    async def run(self) -> None:
        config = self._configure_storage()

        crawler = PlaywrightCrawler(
            configuration=config,
            max_requests_per_crawl=self.max_requests,
            max_request_retries=2,
            max_crawl_depth=10,
            concurrency_settings=ConcurrencySettings(
                max_concurrency=self.max_concurrency,
                min_concurrency=1,
                desired_concurrency=min(10, self.max_concurrency),
            ),
            headless=True,
            browser_type="chromium",
            browser_launch_options={
                "chromium_sandbox": False,
                "args": [
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-background-networking",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-breakpad",
                    "--disable-component-extensions-with-background-pages",
                    "--disable-features=TranslateUI",
                    "--disable-ipc-flooding-protection",
                    "--disable-renderer-backgrounding",
                ],
            },
        )

        @crawler.pre_navigation_hook
        async def before_navigation(context: PlaywrightPreNavCrawlingContext) -> None:
            context.log.info("-> %s", context.request.url)

        @crawler.router.default_handler
        async def handle_page(context: PlaywrightCrawlingContext) -> None:
            url = context.request.url
            if not self.is_valid_url(url):
                context.log.debug("Skipped (filtered): %s", url)
                return

            try:
                await self._optimize_page_load(context.page)

                try:
                    await context.page.wait_for_load_state("domcontentloaded", timeout=15000)
                except PlaywrightError:
                    context.log.warning("Timeout on %s, continuing...", url)

                try:
                    html = await context.page.content()
                except PlaywrightError as e:
                    context.log.error("Failed to get page content for %s: %s", url, e)
                    return

                content = await self._extract_content(html, url)
                if content:
                    await context.push_data(content)
                    context.log.info(
                        "Scraped: %s (%s words, %s chars)",
                        url,
                        content["word_count"],
                        content["char_count"],
                    )
                else:
                    context.log.debug("Skipped (insufficient content): %s", url)
                    return

                links = await self._extract_links(html, url)
                if links:
                    await context.add_requests(links)
                    context.log.debug("Found %s new links", len(links))

            except PlaywrightError as e:
                context.log.error("Playwright error on %s: %s", url, e)
            except Exception as e:
                context.log.error("Unexpected error on %s: %s", url, e, exc_info=True)

        logger.info("Starting crawl from: %s", self.start_url)
        logger.info("Max requests: %s", self.max_requests)
        logger.info("Max concurrency: %s", self.max_concurrency)
        logger.info("Allowed prefix: %s", self.allowed_prefix)

        await crawler.run([self.start_url])

        logger.info("Crawl complete. Total unique URLs visited: %s", len(self._visited_urls))


async def scrape_website() -> None:
    """Scrape the configured site into Crawlee's local dataset storage."""
    scraper = WebScraper(
        start_url=settings.SCRAPING_URL,
        max_requests=1000,
        max_concurrency=50,
        min_content_length=100,
    )
    await scraper.run()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    asyncio.run(scrape_website())

