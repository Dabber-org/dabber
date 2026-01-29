# parallel_cleaner.py
"""
Parallel data cleaning using OpenAI for semantic chunking.
Processes multiple pages concurrently to speed up the cleaning pipeline.
"""
import os
import json
import asyncio
from typing import List, Dict, Any, Optional
import re
from openai import AsyncOpenAI
from pathlib import Path
import sys

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import settings

DATASET_PATH = "./scrape/storage/datasets/default"
CLEANED_DATASET_PATH = "./scrape/storage/datasets/cleaned"
MAX_CONCURRENT = 5  # Number of parallel OpenAI requests
EMBEDDING_CHUNK_SIZE = 1000

# Lazy initialization of OpenAI client
_client: Optional[AsyncOpenAI] = None

def get_openai_client() -> AsyncOpenAI:
    """Get or initialize async OpenAI client."""
    global _client
    if _client is None:
        api_key = settings.openai_api_key
        if not api_key:
            raise ValueError(
                "openai_api_key not set in settings. "
                "Please add OPENAI_API_KEY to your .env file."
            )
        _client = AsyncOpenAI(api_key=api_key)
    return _client


def semantic_split(text: str, max_len: int = 800) -> list[str]:
    """
    Semantic chunking based on paragraphs.
    Works on ANY website.
    """
    text = text.strip()
    if not text:
        return []

    # Split on paragraph boundaries
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks = []
    current = ""

    for p in paragraphs:
        if len(current) + len(p) + 1 > max_len:
            if current.strip():
                chunks.append(current.strip())
            current = p
        else:
            current += " " + p

    if current.strip():
        chunks.append(current.strip())

    return chunks


async def clean_text_with_openai(raw: str, url: str = "", title: str = "") -> Dict[str, Any]:
    """
    Use OpenAI to intelligently clean and structure text content into semantic chunks.
    Returns cleaned text with dynamically detected objects as chunks.
    """
    if not raw or len(raw.strip()) < 50:
        return {
            "cleaned_text": raw.strip(),
            "chunks": []
        }
    
    # Basic preprocessing to reduce token usage
    text = raw
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'\s+', ' ', text)
    
    # Truncate if too long (to manage token limits)
    max_chars = 12000
    if len(text) > max_chars:
        text = text[:max_chars] + "..."
    
    system_prompt = """You are a structured data extractor designed to clean scraped webpages and split them into semantic chunks to be stored in a vector database.

Your job:

Clean the extracted HTML text
- Remove navigation, menus, footers, headers, repeated boilerplate
- Remove social links, cookie banners, login sections, ads, buttons
- Keep ONLY meaningful page content

Identify natural "objects" on the page
Objects can vary depending on the type of page. A page may contain:
- Faculty listings → each professor = one chunk
- Courses → each course = one chunk
- Degree requirements / sections → each section = one chunk
- FAQs → each question-answer pair = one chunk
- Blog posts → full article = one chunk
- Tables → each logical block = one chunk
- Announcements / cards → each item = one chunk
- Contact entries → each person = one chunk
- Policies → each policy = one chunk
- Program descriptions → each subsection = one chunk
- Mixed pages → dynamically detect patterns

Chunking rules:
- NEVER split inside a single object.
- NEVER merge two separate objects into one chunk.
- Each chunk must represent ONE complete logical unit.
- A chunk should be clean, readable, and self-contained.
- Use headings, bold names, or repeating patterns to detect objects.
- If the page has no clear objects, split by major sections.

Return structured JSON:
{
  "cleaned_text": "... full cleaned page text ...",
  "chunks": [
    {
      "id": "string_unique_identifier",
      "title": "short title of the object",
      "type": "object_type_detected",
      "text": "cleaned text for this single object only"
    }
  ]
}

id rules:
- Snake_case
- Derived from the object name/title or section heading
- Example: prof_khaled_shaban, course_cmps_151, section_first_year, faq_housing_policy

type can be:
"faculty", "course", "section", "faq", "policy", "program", "contact", "announcement", "table", "article", "event", "generic"
or any type the model infers

Your output must always be valid JSON."""

    user_prompt = f"""Clean and structure this web content:

URL: {url}
Title: {title}

Raw Content:
{text}

Return only valid JSON with the cleaned content and chunks."""

    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
    
    except Exception as e:
        print(f"OpenAI cleaning failed for {url}: {e}")
        # Fallback to basic cleaning with semantic split
        basic_clean = re.sub(r'<[^>]+>', ' ', text)
        basic_clean = re.sub(r'\s+', ' ', basic_clean).strip()
        
        # Create fallback chunks using semantic split
        fallback_chunks = semantic_split(basic_clean, EMBEDDING_CHUNK_SIZE)
        chunks_data = [
            {
                "id": f"chunk_{i}",
                "title": f"Section {i+1}",
                "type": "generic",
                "text": chunk
            }
            for i, chunk in enumerate(fallback_chunks)
        ]
        
        return {
            "cleaned_text": basic_clean,
            "chunks": chunks_data,
            "error": str(e)
        }


async def process_single_page(page_data: Dict[str, Any], page_index: int) -> Dict[str, Any]:
    """Process a single page with OpenAI cleaning."""
    raw_text = page_data.get("text", "")
    url = page_data.get("url", "")
    title = page_data.get("title", "")
    
    print(f"[{page_index}] Processing: {title[:50]}...")
    
    # Clean the text using OpenAI
    cleaned_result = await clean_text_with_openai(raw_text, url, title)
    cleaned_text = cleaned_result.get("cleaned_text", "")
    ai_chunks = cleaned_result.get("chunks", [])
    
    # Build cleaned page structure
    cleaned_page = {
        "url": url,
        "title": title,
        "original_length": len(raw_text),
        "cleaned_length": len(cleaned_text),
        "full_cleaned_text": cleaned_text,
        "chunks": ai_chunks,
        "num_chunks": len(ai_chunks),
        "page_index": page_index
    }
    
    # Add error info if present
    if "error" in cleaned_result:
        cleaned_page["cleaning_error"] = cleaned_result["error"]
    
    print(f"[{page_index}] ✓ Completed: {title[:50]} ({len(ai_chunks)} chunks)")
    
    return cleaned_page


async def process_batch(pages: List[Dict[str, Any]], start_index: int) -> List[Dict[str, Any]]:
    """Process a batch of pages concurrently."""
    tasks = [
        process_single_page(page, start_index + i)
        for i, page in enumerate(pages)
    ]
    return await asyncio.gather(*tasks)


async def clean_all_pages(force_reclean: bool = False) -> int:
    """
    Clean all pages from the dataset using parallel OpenAI requests.
    
    Args:
        force_reclean: If True, re-clean even if cleaned files exist
    
    Returns:
        Number of pages cleaned
    """
    # Create cleaned dataset directory
    os.makedirs(CLEANED_DATASET_PATH, exist_ok=True)
    
    # Check if already cleaned
    if not force_reclean:
        existing_cleaned = [
            f for f in os.listdir(CLEANED_DATASET_PATH)
            if f.endswith(".json") and f.startswith("cleaned_")
        ]
        if existing_cleaned:
            print(f"Found {len(existing_cleaned)} already-cleaned files.")
            print("Use force_reclean=True to re-clean, or delete the cleaned folder.")
            return len(existing_cleaned)
    
    # Load pages from dataset
    pages = []
    for filename in sorted(os.listdir(DATASET_PATH)):
        if not filename.endswith(".json"):
            continue
        file_path = os.path.join(DATASET_PATH, filename)
        with open(file_path, "r", encoding="utf-8") as f:
            page = json.load(f)
            if len(page.get("text", "")) >= 100:
                pages.append(page)
    
    if not pages:
        print("No pages found to clean!")
        return 0
    
    print(f"\n🚀 Starting parallel cleaning of {len(pages)} pages...")
    print(f"Max concurrent requests: {MAX_CONCURRENT}\n")
    
    # Process in batches for rate limiting
    all_cleaned_pages = []
    for i in range(0, len(pages), MAX_CONCURRENT):
        batch = pages[i:i + MAX_CONCURRENT]
        batch_num = (i // MAX_CONCURRENT) + 1
        total_batches = (len(pages) + MAX_CONCURRENT - 1) // MAX_CONCURRENT
        
        print(f"\n--- Batch {batch_num}/{total_batches} ---")
        cleaned_batch = await process_batch(batch, i)
        all_cleaned_pages.extend(cleaned_batch)
    
    # Save all cleaned pages
    print(f"\n💾 Saving {len(all_cleaned_pages)} cleaned pages...")
    for cleaned_page in all_cleaned_pages:
        page_index = cleaned_page.pop("page_index")
        cleaned_filename = f"cleaned_{page_index:09d}.json"
        cleaned_filepath = os.path.join(CLEANED_DATASET_PATH, cleaned_filename)
        
        with open(cleaned_filepath, "w", encoding="utf-8") as f:
            json.dump(cleaned_page, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Successfully cleaned and saved {len(all_cleaned_pages)} pages to {CLEANED_DATASET_PATH}")
    
    # Print statistics
    total_chunks = sum(p["num_chunks"] for p in all_cleaned_pages)
    avg_chunks = total_chunks / len(all_cleaned_pages) if all_cleaned_pages else 0
    errors = sum(1 for p in all_cleaned_pages if "cleaning_error" in p)
    
    print(f"\n📊 Statistics:")
    print(f"  - Total pages: {len(all_cleaned_pages)}")
    print(f"  - Total chunks: {total_chunks}")
    print(f"  - Avg chunks/page: {avg_chunks:.1f}")
    print(f"  - Errors: {errors}")
    
    return len(all_cleaned_pages)


async def main():
    """Main entry point for standalone execution."""
    import argparse
    
    global MAX_CONCURRENT
    
    parser = argparse.ArgumentParser(description="Parallel web content cleaning with OpenAI")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-cleaning even if cleaned files exist"
    )
    parser.add_argument(
        "--concurrent",
        type=int,
        default=MAX_CONCURRENT,
        help=f"Max concurrent OpenAI requests (default: {MAX_CONCURRENT})"
    )
    
    args = parser.parse_args()
    
    MAX_CONCURRENT = args.concurrent
    
    await clean_all_pages(force_reclean=args.force)


if __name__ == "__main__":
    asyncio.run(main())

