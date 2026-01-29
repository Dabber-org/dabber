import asyncio
from scrape.scraper import scrape_website
from embed.parallel_cleaner import clean_all_pages
from embed.embedder import run_embedding
from tools.vector_search import search_vector_db


async def run_pipeline(mcp):
    """
    Run the static content pipeline:
    1. Scrape website content
    2. If scraping succeeds, run embedding process
    """
    try:
        print("🚀 Starting pipeline: Scraping website...")
        await scrape_website()
        print("✅ Scraping completed successfully")
        
        print("\n🚀 Cleaning data...")
        await clean_all_pages(force_reclean=True)
        
        print("\n🚀 Starting pipeline: Running embeddings...")
        await asyncio.to_thread(run_embedding)
        print("✅ Pipeline completed successfully")

        # update_agent_status("Ready")


        mcp.tool()(search_vector_db)
    except Exception as e:
        print(f"❌ Pipeline failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(run_pipeline())

