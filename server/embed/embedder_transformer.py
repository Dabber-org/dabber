# tools/vector_search.py
# Demo-ready: no env vars, no Torch, just works with FastEmbed + Chroma.

from typing import List, Dict, Any
import chromadb
from fastembed import TextEmbedding

# ---- Fixed demo config ----
CHROMA_PATH = "./chroma_db"
COLLECTION_NAME = "website_embeddings_fastembed_bge"  # new dim ⇒ new collection
EMBED_MODEL = "BAAI/bge-base-en-v1.5"  # lightweight, good quality, supported by fastembed
QUERY_PREFIX = "query: "
PASSAGE_PREFIX = "passage: "

# ---- Chroma + Embedder ----
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Drop old collection if it exists so each run starts fresh
try:
    chroma_client.delete_collection(COLLECTION_NAME)
except Exception:
    # If it does not exist, ignore
    pass

collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
)

_embedder = TextEmbedding(model_name=EMBED_MODEL)

def _embed_single(text: str, is_query: bool) -> List[float]:
    if not text or not text.strip():
        return []
    prefixed = (QUERY_PREFIX if is_query else PASSAGE_PREFIX) + text.strip()
    return next(_embedder.embed([prefixed])).tolist()

def get_batch_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a batch of texts (for document indexing)."""
    if not texts:
        return []
    
    # Add passage prefix for documents
    prefixed_texts = [PASSAGE_PREFIX + text.strip() for text in texts if text.strip()]
    
    # Generate embeddings in batch
    embeddings = list(_embedder.embed(prefixed_texts))
    
    return [emb.tolist() for emb in embeddings]

async def search_vector_db(query: str, n_results: int = 5) -> Dict[str, Any]:
    q = (query or "").strip()
    if not q:
        return {"error": "Empty query text provided."}

    query_vec = _embed_single(q, is_query=True)
    if not query_vec:
        return {"error": "Failed to embed query."}

    res = collection.query(
        query_embeddings=[query_vec],
        n_results=max(1, n_results),
        include=["documents", "metadatas", "distances"],
    )

    if not res.get("documents") or not res["documents"][0]:
        return {"message": "No results found."}

    docs = res["documents"][0]
    metas = res["metadatas"][0]
    dists = res["distances"][0]

    out = []
    for doc, meta, dist in zip(docs, metas, dists):
        out.append({
            "url": (meta or {}).get("url"),
            "title": (meta or {}).get("title", "Untitled"),
            # cosine distance [0..2] → rough similarity [1..0]
            "similarity": round(1 - dist / 2, 3),
            "snippet": (doc or "")[:1000] + ("..." if doc and len(doc) > 1000 else ""),
        })
    return {"query": q, "results": out}
