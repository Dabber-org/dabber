# embedder.py
"""
Embedding pipeline that loads pre-cleaned data and generates vector embeddings.
For cleaning raw data, use parallel_cleaner.py first.
"""
import os
import json
from typing import List, Dict, Any

from .embedder_transformer import (
    get_batch_embeddings,
    collection,
    CHROMA_PATH,
    COLLECTION_NAME,
)

CLEANED_DATASET_PATH = "./scrape/storage/datasets/cleaned"
BATCH_SIZE = 8

def _chunk(lst: List[dict], size: int) -> List[List[dict]]:
    """Split a list into batches of specified size."""
    for i in range(0, len(lst), size):
        yield lst[i : i + size]


def run_embedding():
    """
    Run the embedding process on pre-cleaned dataset files.
    
    Note: Run parallel_cleaner.py first to generate cleaned data.
    """
    if not os.path.exists(CLEANED_DATASET_PATH):
        print(f"❌ Cleaned dataset path not found: {CLEANED_DATASET_PATH}")
        print("Please run 'python -m embed.parallel_cleaner' first to clean the data.")
        return
    
    # Load cleaned files
    cleaned_files = [
        f for f in os.listdir(CLEANED_DATASET_PATH)
        if f.endswith(".json") and f.startswith("cleaned_")
    ]
    
    if not cleaned_files:
        print(f"❌ No cleaned files found in {CLEANED_DATASET_PATH}")
        print("Please run 'python -m embed.parallel_cleaner' first to clean the data.")
        return
    
    print(f"📂 Found {len(cleaned_files)} cleaned files")
    
    initial_count = collection.count()
    print(f"📊 Existing documents in collection '{COLLECTION_NAME}': {initial_count}")
    
    # Load all chunks from cleaned files
    chunked_documents = []
    
    for filename in sorted(cleaned_files):
        file_path = os.path.join(CLEANED_DATASET_PATH, filename)
        
        with open(file_path, "r", encoding="utf-8") as f:
            cleaned_page = json.load(f)
        
        url = cleaned_page.get("url", "")
        title = cleaned_page.get("title", "")
        ai_chunks = cleaned_page.get("chunks", [])
        
        print(f"Loading {filename}: {title[:50]}... ({len(ai_chunks)} chunks)")
        
        # Add each AI-detected chunk as a document for embedding
        for chunk_data in ai_chunks:
            chunk_id = chunk_data.get("id", "")
            chunk_title = chunk_data.get("title", "")
            chunk_type = chunk_data.get("type", "generic")
            chunk_text = chunk_data.get("text", "")
            
            if chunk_text:  # Only add non-empty chunks
                chunked_documents.append({
                    "text": chunk_text,
                    "url": url,
                    "title": title,
                    "chunk_id": chunk_id,
                    "chunk_title": chunk_title,
                    "chunk_type": chunk_type,
                })
    
    print(f"\n📝 Loaded {len(chunked_documents)} chunks from cleaned files")

    inserted = 0
    total_batches = (len(chunked_documents) + BATCH_SIZE - 1) // BATCH_SIZE

    for batch_index, batch_docs in enumerate(_chunk(chunked_documents, BATCH_SIZE), start=1):
        batch_texts = [doc["text"] for doc in batch_docs]
        print(f"Embedding batch {batch_index} / {total_batches}")

        batch_embeddings = get_batch_embeddings(batch_texts)

        ids = []
        documents = []
        metadatas = []

        for doc_idx, doc in enumerate(batch_docs):
            chunk_id = doc.get("chunk_id", "")
            url = doc.get("url", "")
            
            # Create unique document ID
            if url and chunk_id:
                doc_id = f"{url}#{chunk_id}"
            else:
                doc_id = f"doc-{batch_index}-{doc_idx}"

            ids.append(doc_id)
            documents.append(doc["text"])
            metadatas.append({
                "url": url,
                "title": doc.get("title", ""),
                "chunk_id": chunk_id,
                "chunk_title": doc.get("chunk_title", ""),
                "chunk_type": doc.get("chunk_type", "generic"),
            })

        upsert = getattr(collection, "upsert", None)
        if callable(upsert):
            upsert(
                ids=ids,
                embeddings=batch_embeddings,
                documents=documents,
                metadatas=metadatas,
            )
        else:
            collection.add(
                ids=ids,
                embeddings=batch_embeddings,
                documents=documents,
                metadatas=metadatas,
            )

        inserted += len(ids)

    final_count = collection.count()
    successful_upsert = inserted == len(chunked_documents) and final_count >= initial_count + inserted

    print(
        f"\n✅ Upserted {inserted} documents. "
        f"Collection '{COLLECTION_NAME}' now holds {final_count} documents at {CHROMA_PATH}."
    )

    if successful_upsert:
        print("🎉 Embedding completed successfully!")
    else:
        print("⚠️  Warning: Embedding may not have completed fully.")


if __name__ == "__main__":
    run_embedding()
