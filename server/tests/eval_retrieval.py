from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

from fastmcp import Client
from openai import OpenAI
from qdrant_client import AsyncQdrantClient
from llama_index.core import Settings, SimpleDirectoryReader, StorageContext, VectorStoreIndex
from llama_index.readers.file import PDFReader
from llama_index.vector_stores.qdrant import QdrantVectorStore

from embeddings import get_embed_model
from scrape.json_page_reader import ScrapeJSONPageReader
from retrieval.hybrid_search import init_search, vector_db
from settings import settings
from storage import qdrant


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _token_f1(expected: str, context: str) -> float:
    expected_tokens = _tokenize(expected)
    context_tokens = _tokenize(context)
    if not expected_tokens or not context_tokens:
        return 0.0

    expected_counts: Dict[str, int] = {}
    for tok in expected_tokens:
        expected_counts[tok] = expected_counts.get(tok, 0) + 1

    context_counts: Dict[str, int] = {}
    for tok in context_tokens:
        context_counts[tok] = context_counts.get(tok, 0) + 1

    overlap = 0
    for tok, count in expected_counts.items():
        overlap += min(count, context_counts.get(tok, 0))

    precision = overlap / max(1, len(context_tokens))
    recall = overlap / max(1, len(expected_tokens))
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def _estimate_tokens(text: str) -> int:
    return len(_tokenize(text))


def _build_context(results: List[Dict[str, object]], *, use_compressed: bool) -> str:
    parts: List[str] = []
    for result in results:
        if use_compressed:
            parts.append(str(result.get("compressed_text") or ""))
        else:
            parts.append(str(result.get("snippet_text") or ""))
    return "\n\n---\n\n".join(parts)


def _extract_json(text: str) -> Dict[str, object]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}
    return {}


def _judge_with_llm(
    client: OpenAI,
    *,
    model: str,
    query: str,
    expected_answer: str,
    context: str,
) -> Dict[str, object]:
    system = (
        "You are a strict evaluator for retrieval quality. "
        "Use only the provided context. Return ONLY a JSON object with keys: "
        "answer, accuracy, faithfulness, rationale. "
        "accuracy: 0 to 1 score for correctness/completeness of the answer vs expected. "
        "faithfulness: 0 to 1 score for whether the answer is fully supported by context."
    )
    user = (
        f"Question: {query}\n"
        f"Expected answer: {expected_answer}\n"
        f"Context:\n{context}\n"
    )

    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0,
    )

    text = getattr(response, "output_text", "") or ""
    if not text:
        try:
            for item in response.output:
                for content in item.content:
                    if getattr(content, "type", "") == "output_text":
                        text = content.text
                        break
        except Exception:
            text = ""

    data = _extract_json(text)
    return {
        "judge_answer": data.get("answer", ""),
        "judge_accuracy": data.get("accuracy", ""),
        "judge_faithfulness": data.get("faithfulness", ""),
        "judge_rationale": data.get("rationale", ""),
        "judge_model": model,
        "judge_error": "" if data else "failed_to_parse",
    }


def _load_queries(path: Path) -> List[Dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or "query" not in reader.fieldnames:
            raise ValueError("Queries CSV must include a 'query' column.")
        rows: List[Dict[str, str]] = []
        for idx, row in enumerate(reader, start=1):
            query_id = row.get("id") or row.get("query_id") or str(idx)
            rows.append(
                {
                    "id": query_id,
                    "query": row.get("query", "").strip(),
                    "expected_answer": row.get("expected_answer", "").strip(),
                }
            )
        return rows


def _build_index(*, recreate: bool) -> None:
    qdrant.ensure_collection(recreate=recreate)

    reader = SimpleDirectoryReader(
        input_dir=settings.SCRAPE_DATASET_DIR,
        recursive=True,
        exclude=["__metadata__.json"],
        file_extractor={
            ".pdf": PDFReader(return_full_document=False),
            ".json": ScrapeJSONPageReader(),
        },
    )
    documents = reader.load_data()

    client = qdrant.get_client()
    aclient = AsyncQdrantClient(url=qdrant.QDRANT_URL)
    vector_store = QdrantVectorStore(
        client=client,
        aclient=aclient,
        collection_name=qdrant.COLLECTION_NAME,
    )
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    Settings.embed_model = get_embed_model()

    index = VectorStoreIndex.from_documents(
        documents=documents,
        storage_context=storage_context,
        use_async=True,
        transformations=[],
        show_progress=True,
        store_nodes_override=True,
    )

    init_search(index)


async def _run_eval(args: argparse.Namespace) -> List[Dict[str, object]]:
    queries = _load_queries(Path(args.queries))

    rows: List[Dict[str, object]] = []
    strategies = ["snippet", "compressed"] if args.strategy == "both" else [args.strategy]

    do_llm_judge = False
    if args.llm_judge == "on":
        do_llm_judge = True
    elif args.llm_judge == "auto":
        do_llm_judge = bool(os.getenv("OPENAI_API_KEY"))

    judge_client = OpenAI() if do_llm_judge else None

    for query in queries:
        if not query["query"]:
            continue

        start = time.perf_counter()
        response = await vector_db(
            query=query["query"],
            n_results=args.n_results,
            max_chars=args.max_chars,
            semantic_top_k=args.semantic_top_k,
            lexical_top_k=args.lexical_top_k,
        )
        latency_ms = (time.perf_counter() - start) * 1000.0

        error = response.get("error") if isinstance(response, dict) else None
        error_detail = ""
        if isinstance(response, dict):
            error_detail = str(response.get("detail") or "")
        results = response.get("results", []) if isinstance(response, dict) else []

        for strategy in strategies:
            use_compressed = strategy == "compressed"
            context_text = _build_context(results, use_compressed=use_compressed)
            context_chars = len(context_text)
            context_tokens_est = _estimate_tokens(context_text)

            expected_answer = query["expected_answer"]
            answer_in_context = ""
            answer_token_f1 = ""
            if expected_answer:
                normalized_expected = _normalize(expected_answer)
                normalized_context = _normalize(context_text)
                answer_in_context = str(normalized_expected in normalized_context)
                answer_token_f1 = f"{_token_f1(expected_answer, context_text):.4f}"

            estimated_cost = ""
            if args.price_per_1k is not None:
                estimated_cost = f"{(context_tokens_est / 1000.0) * args.price_per_1k:.6f}"

            judge_fields = {
                "judge_answer": "",
                "judge_accuracy": "",
                "judge_faithfulness": "",
                "judge_rationale": "",
                "judge_model": "",
                "judge_error": "",
            }
            if (
                do_llm_judge
                and judge_client is not None
                and not error
                and expected_answer
                and context_text
            ):
                try:
                    judge_fields = _judge_with_llm(
                        judge_client,
                        model=args.llm_judge_model,
                        query=query["query"],
                        expected_answer=expected_answer,
                        context=context_text,
                    )
                except Exception as exc:
                    judge_fields = {
                        "judge_answer": "",
                        "judge_accuracy": "",
                        "judge_faithfulness": "",
                        "judge_rationale": "",
                        "judge_model": args.llm_judge_model,
                        "judge_error": str(exc),
                    }

            rows.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "query_id": query["id"],
                    "query": query["query"],
                    "strategy": strategy,
                    "n_results": len(results),
                    "latency_ms": f"{latency_ms:.2f}",
                    "context_chars": context_chars,
                    "context_tokens_est": context_tokens_est,
                    "estimated_cost_usd": estimated_cost,
                    "answer_in_context": answer_in_context,
                    "answer_token_f1": answer_token_f1,
                    "error": error or "",
                    "error_detail": error_detail,
                    **judge_fields,
                }
            )

    return rows


async def _run_eval_via_mcp(args: argparse.Namespace) -> List[Dict[str, object]]:
    queries = _load_queries(Path(args.queries))

    rows: List[Dict[str, object]] = []
    strategies = ["snippet", "compressed"] if args.strategy == "both" else [args.strategy]

    do_llm_judge = False
    if args.llm_judge == "on":
        do_llm_judge = True
    elif args.llm_judge == "auto":
        do_llm_judge = bool(os.getenv("OPENAI_API_KEY"))

    judge_client = OpenAI() if do_llm_judge else None

    client = Client(args.mcp_url)
    async with client:
        for query in queries:
            if not query["query"]:
                continue

            start = time.perf_counter()
            result = await client.call_tool_mcp(
                "vector_db",
                {
                    "query": query["query"],
                    "n_results": args.n_results,
                    "max_chars": args.max_chars,
                    "semantic_top_k": args.semantic_top_k,
                    "lexical_top_k": args.lexical_top_k,
                    "compress_percentile": args.compress_percentile,
                    "context_before": args.context_before,
                    "context_after": args.context_after,
                },
            )
            latency_ms = (time.perf_counter() - start) * 1000.0

            if result.isError:
                error_text = ""
                if result.content:
                    error_text = getattr(result.content[0], "text", "") or ""
                response = {"error": "tool_error", "detail": error_text}
            else:
                structured = getattr(result, "structuredContent", None) or getattr(
                    result, "structured_content", None
                )
                response = structured or {}
                if isinstance(response, dict) and "result" in response and "results" not in response:
                    response = response["result"]

            error = response.get("error") if isinstance(response, dict) else None
            error_detail = ""
            if isinstance(response, dict):
                error_detail = str(response.get("detail") or "")
            results = response.get("results", []) if isinstance(response, dict) else []

            for strategy in strategies:
                use_compressed = strategy == "compressed"
                context_text = _build_context(results, use_compressed=use_compressed)
                context_chars = len(context_text)
                context_tokens_est = _estimate_tokens(context_text)

                expected_answer = query["expected_answer"]
                answer_in_context = ""
                answer_token_f1 = ""
                if expected_answer:
                    normalized_expected = _normalize(expected_answer)
                    normalized_context = _normalize(context_text)
                    answer_in_context = str(normalized_expected in normalized_context)
                    answer_token_f1 = f"{_token_f1(expected_answer, context_text):.4f}"

                estimated_cost = ""
                if args.price_per_1k is not None:
                    estimated_cost = f"{(context_tokens_est / 1000.0) * args.price_per_1k:.6f}"

                judge_fields = {
                    "judge_answer": "",
                    "judge_accuracy": "",
                    "judge_faithfulness": "",
                    "judge_rationale": "",
                    "judge_model": "",
                    "judge_error": "",
                }
                if (
                    do_llm_judge
                    and judge_client is not None
                    and not error
                    and expected_answer
                    and context_text
                ):
                    try:
                        judge_fields = _judge_with_llm(
                            judge_client,
                            model=args.llm_judge_model,
                            query=query["query"],
                            expected_answer=expected_answer,
                            context=context_text,
                        )
                    except Exception as exc:
                        judge_fields = {
                            "judge_answer": "",
                            "judge_accuracy": "",
                            "judge_faithfulness": "",
                            "judge_rationale": "",
                            "judge_model": args.llm_judge_model,
                            "judge_error": str(exc),
                        }

                rows.append(
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "query_id": query["id"],
                        "query": query["query"],
                        "strategy": strategy,
                        "n_results": len(results),
                        "latency_ms": f"{latency_ms:.2f}",
                        "context_chars": context_chars,
                        "context_tokens_est": context_tokens_est,
                        "estimated_cost_usd": estimated_cost,
                        "answer_in_context": answer_in_context,
                        "answer_token_f1": answer_token_f1,
                        "error": error or "",
                        "error_detail": error_detail,
                        **judge_fields,
                    }
                )

    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate retrieval strategies.")
    parser.add_argument(
        "--queries",
        required=True,
        help="Path to CSV with queries (relative to tests/ if not absolute).",
    )
    parser.add_argument(
        "--output",
        default="output/retrieval_eval.csv",
        help="Output CSV path (relative to tests/ if not absolute).",
    )
    parser.add_argument(
        "--strategy",
        choices=["snippet", "compressed", "both"],
        default="both",
        help="Which strategy to evaluate.",
    )
    parser.add_argument(
        "--mcp-url",
        default="",
        help="Optional MCP server URL (e.g., http://localhost:8000/mcp). If set, queries are sent to the running server.",
    )
    parser.add_argument("--n-results", type=int, default=5)
    parser.add_argument("--max-chars", type=int, default=2000)
    parser.add_argument("--semantic-top-k", type=int, default=30)
    parser.add_argument("--lexical-top-k", type=int, default=30)
    parser.add_argument("--compress-percentile", type=float, default=0.2)
    parser.add_argument("--context-before", type=int, default=1)
    parser.add_argument("--context-after", type=int, default=1)
    parser.add_argument(
        "--llm-judge",
        choices=["auto", "on", "off"],
        default="auto",
        help="Use an OpenAI LLM judge for accuracy/faithfulness scoring.",
    )
    parser.add_argument(
        "--llm-judge-model",
        default="gpt-4.1-nano",
        help="OpenAI model to use for LLM judging (default: cheapest model).",
    )
    parser.add_argument(
        "--recreate-collection",
        action="store_true",
        help="Recreate Qdrant collection before indexing.",
    )
    parser.add_argument(
        "--price-per-1k",
        type=float,
        default=None,
        help="Optional USD cost per 1k tokens for estimated cost.",
    )

    args = parser.parse_args()

    if args.llm_judge == "on" and not os.getenv("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is required when --llm-judge=on", file=sys.stderr)
        return 1

    queries_path = Path(args.queries)
    if not queries_path.is_absolute():
        queries_path = Path(__file__).resolve().parent / queries_path
    args.queries = str(queries_path)

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = Path(__file__).resolve().parent / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if args.mcp_url:
        rows = asyncio.run(_run_eval_via_mcp(args))
    else:
        try:
            _build_index(recreate=args.recreate_collection)
        except Exception as exc:
            print(f"Failed to build index: {exc}", file=sys.stderr)
            return 1
        rows = asyncio.run(_run_eval(args))
    if not rows:
        print("No rows generated. Check your queries file.", file=sys.stderr)
        return 1

    fieldnames = list(rows[0].keys())
    with output_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote report to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
