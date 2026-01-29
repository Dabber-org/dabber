#!/usr/bin/env python
"""
Complete embedding pipeline: Clean data with OpenAI → Embed into ChromaDB

Usage:
    python -m embed.run_pipeline            # Run both cleaning and embedding
    python -m embed.run_pipeline --clean    # Only clean data
    python -m embed.run_pipeline --embed    # Only embed (requires cleaned data)
    python -m embed.run_pipeline --force    # Force re-clean existing data
"""
import asyncio
import argparse
import sys


async def main():
    parser = argparse.ArgumentParser(
        description="Run the complete data cleaning and embedding pipeline"
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Only run data cleaning step"
    )
    parser.add_argument(
        "--embed",
        action="store_true",
        help="Only run embedding step"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-clean even if cleaned files exist"
    )
    parser.add_argument(
        "--concurrent",
        type=int,
        default=5,
        help="Max concurrent OpenAI requests during cleaning (default: 5)"
    )
    
    args = parser.parse_args()
    
    # If neither flag is set, run both
    run_clean = args.clean or not args.embed
    run_embed = args.embed or not args.clean
    
    print("=" * 60)
    print("🚀 EMBEDDING PIPELINE")
    print("=" * 60)
    
    # Step 1: Clean data with OpenAI (parallel)
    if run_clean:
        print("\n📝 STEP 1: Cleaning data with OpenAI (parallel)")
        print("-" * 60)
        
        from .parallel_cleaner import clean_all_pages, MAX_CONCURRENT
        
        # Update max concurrent if specified
        if args.concurrent:
            import embed.parallel_cleaner as pc
            pc.MAX_CONCURRENT = args.concurrent
        
        num_cleaned = await clean_all_pages(force_reclean=args.force)
        
        if num_cleaned == 0:
            print("\n❌ No pages were cleaned. Aborting.")
            sys.exit(1)
        
        print(f"\n✅ Cleaned {num_cleaned} pages")
    
    # Step 2: Embed cleaned data
    if run_embed:
        print("\n" + "=" * 60)
        print("🔢 STEP 2: Embedding cleaned data into ChromaDB")
        print("-" * 60 + "\n")
        
        from .embedder import run_embedding
        run_embedding()
    
    print("\n" + "=" * 60)
    print("🎉 PIPELINE COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

