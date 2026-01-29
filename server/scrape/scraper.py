import asyncio
import logging
from pathlib import Path
from typing import Set, Optional
from urllib.parse import urlparse, urljoin
from contextlib import suppress

from bs4 import BeautifulSoup
from crawlee import ConcurrencySettings, service_locator
from crawlee.crawlers import PlaywrightCrawler, PlaywrightCrawlingContext, PlaywrightPreNavCrawlingContext
from crawlee.configuration import Configuration
from crawlee.errors import ServiceConflictError
from crawlee.events import LocalEventManager
from crawlee.storage_clients import FileSystemStorageClient
from playwright.async_api import Page, Error as PlaywrightError

from config import settings


# Configure module-level logger
logger = logging.getLogger(__name__)


class WebScraper:
    """
    Production-grade web scraper with intelligent URL filtering, resource optimization,
    and comprehensive error handling.
    
    Features:
    - Concurrent crawling with configurable limits
    - Smart URL deduplication and validation
    - Resource blocking for faster page loads
    - Robust error handling and logging
    - Memory-efficient link processing
    """
    
    # Use frozenset for O(1) lookup performance
    DISALLOWED_EXTENSIONS = frozenset([
        ".pdf", ".zip", ".doc", ".docx", ".xls", ".xlsx", 
        ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif", 
        ".mp4", ".mp3", ".avi", ".mov", ".exe", ".dmg"
    ])
    
    SKIP_PATTERNS = frozenset([
        "/_layouts/15/Authenticate.aspx",
        "/auth/",
        "/login",
        "/logout",
        "/signin",
        "/signout"
    ])
    
    INVALID_HREF_PREFIXES = frozenset([
        "javascript:", "mailto:", "tel:", "sms:", "data:", "ftp:"
    ])
    
    INVALID_HREF_VALUES = frozenset([
        "#", "javascript:void(0)", "javascript:void(0);", 
        "null", "undefined", ""
    ])
    
    def __init__(
        self, 
        start_url: str, 
        max_requests: int = 10000,
        max_concurrency: int = 50,
        min_content_length: int = 100
    ):
        """
        Initialize the web scraper.
        
        Args:
            start_url: The starting URL for crawling
            max_requests: Maximum number of pages to crawl
            max_concurrency: Maximum concurrent requests
            min_content_length: Minimum text length to consider valid content
        """
        self.start_url = start_url
        self.max_requests = max_requests
        self.max_concurrency = max_concurrency
        self.min_content_length = min_content_length
        
        self._setup_url_constraints()
        self._visited_urls: Set[str] = set()
        
        logger.info(f"Initialized scraper for {start_url}")
        
    def _setup_url_constraints(self) -> None:
        """Parse and store URL filtering constraints."""
        parsed = urlparse(self.start_url)
        # Normalize scheme/netloc for case-insensitive comparisons
        self.allowed_scheme = (parsed.scheme or "").lower()
        self.allowed_netloc = parsed.netloc.lower()
        
        # Normalize path prefix
        path = parsed.path.rstrip("/") or "/"
        self.allowed_prefix = path if path.endswith("/") else f"{path}/"
        self.allowed_prefix_lower = self.allowed_prefix.lower()
        
        logger.debug(
            f"URL constraints: scheme={self.allowed_scheme}, "
            f"netloc={self.allowed_netloc}, prefix={self.allowed_prefix}"
        )
        
    def _configure_storage(self) -> Configuration:
        """
        Configure Crawlee storage with proper error handling.
        
        Returns:
            Configuration object for Crawlee
        """
        storage_dir = Path(__file__).resolve().parent / "storage"
        storage_dir.mkdir(parents=True, exist_ok=True)
        
        config = Configuration(
            purge_on_start=True,
            storage_dir=str(storage_dir)
        )
        
        # Set configuration with proper error handling
        with suppress(ServiceConflictError):
            service_locator.set_configuration(config)
        
        # If configuration already exists, update it
        if service_locator.get_configuration() != config:
            config = Configuration.get_global_configuration()
            config.purge_on_start = True
            config.storage_dir = str(storage_dir)

        # Wire up explicit clients to avoid warnings
        with suppress(ServiceConflictError):
            service_locator.set_storage_client(FileSystemStorageClient())
        
        with suppress(ServiceConflictError):
            service_locator.set_event_manager(LocalEventManager.from_config(config))
            
        logger.info(f"Storage configured at: {storage_dir}")
        return config
    
    def is_valid_url(self, url: str) -> bool:
        """
        Fast URL validation with early rejection.
        
        Args:
            url: URL to validate
            
        Returns:
            True if URL should be crawled, False otherwise
        """
        if not url or len(url) > 2000:  # Reject overly long URLs
            return False
            
        url_lower = url.lower()
        
        # Check file extensions (O(1) lookup with frozenset)
        if any(url_lower.endswith(ext) for ext in self.DISALLOWED_EXTENSIONS):
            return False
            
        # Check skip patterns
        if any(pattern in url for pattern in self.SKIP_PATTERNS):
            return False
        
        # Parse and validate
        try:
            parsed = urlparse(url)
        except (ValueError, AttributeError):
            return False
            
        # Validate scheme and netloc
        scheme = (parsed.scheme or "").lower()
        netloc = parsed.netloc.lower()
        if scheme != self.allowed_scheme or netloc != self.allowed_netloc:
            return False
            
        # Validate path prefix
        path = parsed.path or "/"
        normalized_path = path if path.endswith("/") else f"{path}/"
        
        return normalized_path.lower().startswith(self.allowed_prefix_lower)
    
    async def _optimize_page_load(self, page: Page) -> None:
        """
        Configure page for optimal performance by blocking unnecessary resources.
        
        Args:
            page: Playwright page object
        """
        async def route_handler(route):
            """Handle routing with proper error handling."""
            try:
                if route.request.resource_type in ["image", "media", "font", "stylesheet"]:
                    await route.abort()
                else:
                    await route.continue_()
            except PlaywrightError:
                # Route may already be handled, ignore
                pass
        
        try:
            await page.route("**/*", route_handler)
            await page.set_viewport_size({"width": 1280, "height": 720})
        except PlaywrightError as e:
            logger.warning(f"Failed to optimize page load: {e}")
    
    async def _extract_links(self, html: str, base_url: str) -> list[str]:
        """
        Extract and validate links efficiently with comprehensive filtering.
        
        Args:
            html: HTML content to parse
            base_url: Base URL for resolving relative links
            
        Returns:
            List of valid absolute URLs
        """
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception as e:
            logger.error(f"Failed to parse HTML: {e}")
            return []
        
        links = []
        
        for anchor in soup.find_all("a", href=True):
            try:
                raw_href = anchor["href"].strip()
                
                # Fast rejection of invalid hrefs
                if not raw_href:
                    continue
                    
                href_lower = raw_href.lower()
                
                # Check invalid values
                if href_lower in self.INVALID_HREF_VALUES:
                    continue
                
                # Check invalid prefixes
                if any(href_lower.startswith(prefix) for prefix in self.INVALID_HREF_PREFIXES):
                    continue
                
                # Additional sanity checks
                if "undefined" in href_lower or "null" in href_lower:
                    continue

                # Resolve to absolute URL
                absolute_url = urljoin(base_url, raw_href)
                
                # Remove fragments for deduplication
                absolute_url = absolute_url.split("#")[0].rstrip("/")
                canonical_url = absolute_url.lower()
                
                # Validate and deduplicate
                if canonical_url not in self._visited_urls and self.is_valid_url(absolute_url):
                    links.append(absolute_url)
                    self._visited_urls.add(canonical_url)
                    
            except (ValueError, AttributeError, TypeError):
                # Skip malformed links
                continue
                
        return links
    
    async def _extract_content(self, html: str, url: str) -> Optional[dict]:
        """
        Extract meaningful content from HTML with comprehensive cleaning.
        
        Args:
            html: HTML content to parse
            url: Source URL
            
        Returns:
            Dictionary containing extracted content or None if insufficient
        """
        try:
            soup = BeautifulSoup(html, "lxml")
        except Exception as e:
            logger.error(f"Failed to parse HTML from {url}: {e}")
            return None
        
        # Extract title with fallback
        title = ""
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        elif soup.find("h1"):
            # Fallback to first h1
            h1 = soup.find("h1")
            title = h1.get_text(strip=True) if h1 else ""
        
        # Remove non-content elements
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
            element.decompose()
        
        # Extract text with proper spacing
        text = soup.get_text(separator=" ", strip=True)
        
        # Normalize whitespace
        text = " ".join(text.split())
        
        # Filter out pages with insufficient content
        if len(text) < self.min_content_length:
            return None
        
        word_count = len(text.split())
        
        return {
            "url": url,
            "title": title,
            "text": text,
            "word_count": word_count,
            "char_count": len(text)
        }
    
    async def run(self) -> None:
        """Execute the web scraping process with full error handling."""
        config = self._configure_storage()
        
        crawler = PlaywrightCrawler(
            configuration=config,
            max_requests_per_crawl=self.max_requests,
            max_request_retries=2,
            max_crawl_depth=10,

            # Optimized concurrency settings
            concurrency_settings=ConcurrencySettings(
                max_concurrency=self.max_concurrency,
                min_concurrency=1,
                desired_concurrency=min(10, self.max_concurrency),
            ),
            
            # Browser configuration with stealth options
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
                ]
            },
        )
        
        @crawler.pre_navigation_hook
        async def before_navigation(context: PlaywrightPreNavCrawlingContext) -> None:
            """Log navigation attempts."""
            context.log.info(f"→ {context.request.url}")
        
        @crawler.router.default_handler
        async def handle_page(context: PlaywrightCrawlingContext) -> None:
            """Process each page with comprehensive error handling."""
            url = context.request.url
            
            # Early validation
            if not self.is_valid_url(url):
                context.log.debug(f"⊘ Filtered: {url}")
                return
            
            try:
                # Optimize page loading
                await self._optimize_page_load(context.page)
                
                # Wait for essential content with timeout
                try:
                    await context.page.wait_for_load_state("domcontentloaded", timeout=15000)
                except PlaywrightError:
                    context.log.warning(f"⚠ Timeout on {url}, continuing...")
                    # Continue anyway - page might have partial content
                
                # Extract HTML
                try:
                    html = await context.page.content()
                except PlaywrightError as e:
                    context.log.error(f"✗ Failed to get page content for {url}: {e}")
                    return
                
                # Extract content
                content = await self._extract_content(html, url)
                if content:
                    await context.push_data(content)
                    context.log.info(
                        f"✓ Scraped: {url} "
                        f"({content['word_count']} words, {content['char_count']} chars)"
                    )
                else:
                    context.log.debug(f"⊘ Skipped (insufficient content): {url}")
                    return
                
                # Extract and enqueue links
                links = await self._extract_links(html, url)
                if links:
                    await context.add_requests(links)
                    context.log.debug(f"  → Found {len(links)} new links")
                    
            except PlaywrightError as e:
                context.log.error(f"✗ Playwright error on {url}: {e}")
            except Exception as e:
                context.log.error(f"✗ Unexpected error on {url}: {e}", exc_info=True)
        
        # Start crawling with informative output
        print("=" * 60)
        print(f"🚀 Starting crawl from: {self.start_url}")
        print(f"📊 Max requests: {self.max_requests}")
        print(f"⚡ Max concurrency: {self.max_concurrency}")
        print(f"🎯 Allowed prefix: {self.allowed_prefix}")
        print("=" * 60)
        
        try:
            await crawler.run([self.start_url])
        except KeyboardInterrupt:
            logger.info("Crawl interrupted by user")
            print("\n⚠ Crawl interrupted by user")
        except Exception as e:
            logger.error(f"Crawl failed with error: {e}", exc_info=True)
            print(f"\n❌ Crawl failed: {e}")
            raise
        
        print("=" * 60)
        print("✅ Crawl complete!")
        print(f"📁 Results saved to: ./storage/datasets/default")
        print(f"📊 Total unique URLs visited: {len(self._visited_urls)}")
        print("=" * 60)


async def scrape_website() -> None:
    """Main entry point for the scraper."""
    scraper = WebScraper(
        start_url=settings.SCRAPING_URL,
        max_requests=1000,
        max_concurrency=50,
        min_content_length=100
    )
    await scraper.run()


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    asyncio.run(scrape_website())
