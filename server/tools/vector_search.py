# tools/vector_search.py
from typing import Dict, Any, List
import chromadb
from fastembed import TextEmbedding

# ---- Configuration ----
CHROMA_PATH = "./chroma_db"
COLLECTION_NAME = "website_embeddings_fastembed_bge"
EMBED_MODEL = "BAAI/bge-base-en-v1.5"
QUERY_PREFIX = "query: "
PASSAGE_PREFIX = "passage: "


# ---- Initialize Chroma DB and Embedder ----
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"},
)

_embedder = TextEmbedding(model_name=EMBED_MODEL)


def _embed_query(text: str) -> List[float]:
    """Generate embedding for a query."""
    if not text or not text.strip():
        return []
    prefixed = QUERY_PREFIX + text.strip()
    return next(_embedder.embed([prefixed])).tolist()


async def search_vector_db(query: str, n_results: int = 5) -> Dict[str, Any]:
    """
    Search the website vector database for content semantically similar to the query.
    Use this tool to answer questions about content that none of the other tools can answer.
    
    Args:
        query: The search query text
        n_results: Number of results to return (default: 5)
    
    Returns:
        Dictionary with query and results containing:
        - url: Source page URL
        - title: Page title
        - similarity: Semantic similarity score (0-1)
        - snippet: Text excerpt (up to 1000 chars)
        - chunk_id: Semantic identifier (e.g., "prof_khaled_shaban") if available
        - chunk_title: Human-readable chunk title if available
        - chunk_type: Object type (faculty, course, faq, etc.) if available
    """
    q = (query or "").strip()
    if not q:
        return {"error": "Empty query text provided."}

    # Generate embedding for query
    query_vec = _embed_query(q)
    if not query_vec:
        return {"error": "Failed to embed query."}

    # Query Chroma DB
    res = collection.query(
        query_embeddings=[query_vec],
        n_results=max(1, n_results),
        include=["documents", "metadatas", "distances"],
    )

    # Handle empty results
    if not res.get("documents") or not res["documents"][0]:
        return {"message": "No results found."}

    docs = res["documents"][0]
    metas = res["metadatas"][0]
    dists = res["distances"][0]

    # Promote literal matches and prefer them per-URL
    normalized_query = q.casefold()
    raw_matches = []
    for idx, (doc, meta, dist) in enumerate(zip(docs, metas, dists)):
        doc_text = doc or ""
        similarity = round(1 - dist / 2, 3)  # cosine distance [0..2] => rough similarity [1..0]
        
        result = {
            "url": (meta or {}).get("url"),
            "title": (meta or {}).get("title", "Untitled"),
            "similarity": similarity,
            "snippet": doc_text[:1000] + ("..." if doc_text and len(doc_text) > 1000 else ""),
            "_has_literal": normalized_query in doc_text.casefold(),
            "_idx": idx,  # preserve tie-breaker
        }
        
        # Add new chunk metadata if available
        if meta:
            chunk_id = meta.get("chunk_id")
            chunk_title = meta.get("chunk_title")
            chunk_type = meta.get("chunk_type")
            
            if chunk_id:
                result["chunk_id"] = chunk_id
            if chunk_title:
                result["chunk_title"] = chunk_title
            if chunk_type:
                result["chunk_type"] = chunk_type
        
        raw_matches.append(result)

    # Per-URL keep the best candidate, preferring literal hits over non-literal
    best_by_url = {}
    for m in raw_matches:
        url_key = (m.get("url") or "").lower()
        existing = best_by_url.get(url_key)
        if not existing:
            best_by_url[url_key] = m
            continue
        # Prefer literal over non-literal; otherwise prefer higher similarity; tie by earlier index
        if m["_has_literal"] and not existing["_has_literal"]:
            best_by_url[url_key] = m
        elif m["_has_literal"] == existing["_has_literal"]:
            if m["similarity"] > existing["similarity"] or (
                m["similarity"] == existing["similarity"] and m["_idx"] < existing["_idx"]
            ):
                best_by_url[url_key] = m

    # Sort: literal first, then similarity descending, then original order
    merged = list(best_by_url.values())
    merged.sort(key=lambda m: (
        not m["_has_literal"],
        -m["similarity"],
        m["_idx"],
    ))

    for m in merged:
        m.pop("_has_literal", None)
        m.pop("_idx", None)

    return {
        "query": q,
        "results": merged
    }
