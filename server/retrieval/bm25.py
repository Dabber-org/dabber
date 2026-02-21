from __future__ import annotations

"""BM25 helpers for hybrid retrieval and evaluation."""

from dataclasses import dataclass
from typing import Optional, Sequence

try:
    import Stemmer  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Stemmer = None  # type: ignore

from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import Document, MetadataMode
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.retrievers.bm25 import BM25Retriever


@dataclass(frozen=True)
class BM25Config:
    chunk_size: int = 512
    similarity_top_k: int = 5
    language: str | None = "english"


def _resolve_stemmer(language: str | None):
    if not language or Stemmer is None:
        return None
    try:
        return Stemmer.Stemmer(language)
    except Exception:
        return None


def build_bm25_retriever(
    documents: Sequence[Document],
    *,
    config: Optional[BM25Config] = None,
) -> BM25Retriever:
    """Build a BM25 retriever over documents (lexical search)."""
    cfg = config or BM25Config()

    # BM25 scoring should operate on page text only; large metadata blobs can
    # trigger chunking failures ("Metadata length ... is longer than chunk size").
    text_only_documents = [
        Document(text=doc.get_content(metadata_mode=MetadataMode.NONE), metadata={})
        for doc in documents
    ]
    splitter = SentenceSplitter(chunk_size=cfg.chunk_size, include_metadata=False)
    nodes = splitter.get_nodes_from_documents(text_only_documents)

    docstore = SimpleDocumentStore()
    docstore.add_documents(nodes)

    stemmer = _resolve_stemmer(cfg.language)
    return BM25Retriever.from_defaults(
        docstore=docstore,
        similarity_top_k=cfg.similarity_top_k,
        stemmer=stemmer,
        language=cfg.language if cfg.language else None,
    )


def build_bm25_from_index(
    index: VectorStoreIndex,
    *,
    config: Optional[BM25Config] = None,
) -> BM25Retriever:
    """Build a BM25 retriever over an existing index's docstore."""
    cfg = config or BM25Config()
    stemmer = _resolve_stemmer(cfg.language)
    return BM25Retriever.from_defaults(
        index=index,
        similarity_top_k=cfg.similarity_top_k,
        stemmer=stemmer,
        language=cfg.language if cfg.language else None,
    )


def bm25_search(
    documents: Sequence[Document],
    query: str,
    *,
    config: Optional[BM25Config] = None,
):
    """Convenience wrapper: build a retriever and run a query."""
    retriever = build_bm25_retriever(documents, config=config)
    return retriever.retrieve(query)


__all__ = [
    "BM25Config",
    "build_bm25_from_index",
    "build_bm25_retriever",
    "bm25_search",
]
