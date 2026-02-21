from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import os
import re
import sys
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

SERVER_ROOT = Path(__file__).resolve().parents[1]
if str(SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVER_ROOT))

if os.name == "nt":
    warnings.filterwarnings("ignore", message="resource module not available on Windows")

from fastmcp import Client
from openai import OpenAI

logger = logging.getLogger(__name__)


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


def _setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


async def _run_eval_via_mcp(args: argparse.Namespace) -> List[Dict[str, object]]:
    queries = _load_queries(Path(args.queries))
    logger.info("Loaded %d queries from %s", len(queries), args.queries)

    rows: List[Dict[str, object]] = []
    strategies = ["snippet", "compressed"] if args.strategy == "both" else [args.strategy]

    do_llm_judge = False
    if args.llm_judge == "on":
        do_llm_judge = True
    elif args.llm_judge == "auto":
        do_llm_judge = bool(os.getenv("OPENAI_API_KEY"))

    judge_client = OpenAI() if do_llm_judge else None

    client = Client(args.mcp_url)
    logger.info("Connecting to MCP server at %s", args.mcp_url)
    async with client:
        for idx, query in enumerate(queries, start=1):
            if not query["query"]:
                logger.debug("Skipping empty query row id=%s", query.get("id"))
                continue

            logger.info(
                "Running query %d/%d (id=%s)",
                idx,
                len(queries),
                query["id"],
            )
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
                    "filter_host": args.filter_host,
                    "filter_path_prefix": args.filter_path_prefix,
                    "filter_language": args.filter_language,
                    "filter_content_type": args.filter_content_type,
                    "filter_status_code": args.filter_status_code,
                    "metadata_rank_boost": args.metadata_rank_boost,
                },
            )
            latency_ms = (time.perf_counter() - start) * 1000.0

            if result.isError:
                error_text = ""
                if result.content:
                    error_text = getattr(result.content[0], "text", "") or ""
                response = {"error": "tool_error", "detail": error_text}
                logger.warning(
                    "MCP tool call failed for query id=%s: %s",
                    query["id"],
                    error_text or "unknown tool error",
                )
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
            logger.info(
                "Query id=%s completed in %.2f ms with %d results%s",
                query["id"],
                latency_ms,
                len(results),
                f" (error={error})" if error else "",
            )

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
                        logger.warning(
                            "LLM judge failed for query id=%s strategy=%s: %s",
                            query["id"],
                            strategy,
                            exc,
                        )
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

    logger.info("Generated %d eval rows", len(rows))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate retrieval strategies.")
    parser.add_argument(
        "--queries",
        default="",
        help="Path to CSV with queries (relative to tests/ if not absolute). Defaults to queries.template.csv.",
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
        default=os.getenv("MCP_URL", "http://localhost:8000/mcp"),
        help=(
            "MCP server URL (e.g., http://localhost:8000/mcp). "
            "Defaults to MCP_URL env var or http://localhost:8000/mcp."
        ),
    )
    parser.add_argument("--n-results", type=int, default=5)
    parser.add_argument("--max-chars", type=int, default=2000)
    parser.add_argument("--semantic-top-k", type=int, default=30)
    parser.add_argument("--lexical-top-k", type=int, default=30)
    parser.add_argument("--compress-percentile", type=float, default=0.2)
    parser.add_argument("--context-before", type=int, default=1)
    parser.add_argument("--context-after", type=int, default=1)
    parser.add_argument("--filter-host", default=None)
    parser.add_argument("--filter-path-prefix", default=None)
    parser.add_argument("--filter-language", default=None)
    parser.add_argument("--filter-content-type", default=None)
    parser.add_argument("--filter-status-code", type=int, default=None)
    parser.add_argument("--metadata-rank-boost", type=float, default=0.2)
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
        "--price-per-1k",
        type=float,
        default=None,
        help="Optional USD cost per 1k tokens for estimated cost.",
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default=os.getenv("EVAL_LOG_LEVEL", "INFO").upper(),
        help="Logging level for eval execution.",
    )

    args = parser.parse_args()
    _setup_logging(args.log_level)
    logger.info("Starting retrieval eval")

    if args.llm_judge == "on" and not os.getenv("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is required when --llm-judge=on", file=sys.stderr)
        return 1

    if not args.queries:
        args.queries = "queries.template.csv"

    queries_path = Path(args.queries)
    if not queries_path.is_absolute():
        queries_path = Path(__file__).resolve().parent / queries_path
    if not queries_path.exists():
        parser.error(
            f"queries CSV not found: {queries_path}. "
            "Pass --queries or create tests/queries.template.csv."
        )
    args.queries = str(queries_path)

    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = Path(__file__).resolve().parent / output_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Writing report to %s", output_path)

    rows = asyncio.run(_run_eval_via_mcp(args))
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
