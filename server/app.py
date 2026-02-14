from __future__ import annotations

"""FastMCP server entrypoint.

Modes:
- Dynamic: generate tools from an OpenAPI spec (if enabled and OPENAPI_URL set).
- Static: scrape + index into Qdrant, then expose hybrid retrieval over that index.
"""

import asyncio
import logging

import httpx
import requests
from fastmcp import FastMCP

from settings import settings

logger = logging.getLogger(__name__)

SERVER_NAME = "Dabber MCP Server"


def update_agent_status(status: str) -> None:
    """Send agent status updates to the dashboard (best-effort)."""
    if not settings.DASHBOARD_URL or not settings.AGENT_ID:
        return

    url = f"{settings.DASHBOARD_URL}/api/agents/{settings.AGENT_ID}/status"
    data = {"status": status.upper()}
    try:
        requests.patch(url, json=data, timeout=5)
    except Exception as e:
        logger.warning("Failed to update agent status (%s): %s", status, e)


def create_base_mcp() -> FastMCP:
    """Create the base MCP server without any generated tools."""
    return FastMCP(SERVER_NAME)


def clean_response_schemas(spec: dict) -> dict:
    """Remove response schemas that cause validation errors in some MCP clients."""
    if "paths" in spec:
        for path_data in spec["paths"].values():
            for operation in path_data.values():
                if isinstance(operation, dict) and "responses" in operation:
                    for response in operation["responses"].values():
                        if "content" in response:
                            response["content"] = {}
    return spec


def add_openapi_tools(base_mcp: FastMCP) -> FastMCP:
    """Augment the server with OpenAPI-generated tools (if configured)."""
    api_base_url = (settings.API_BASE_URL or "").strip()
    openapi_url = (settings.OPENAPI_URL or "").strip()

    if not api_base_url or not openapi_url:
        return base_mcp

    openapi_spec = httpx.get(openapi_url).json()
    if not openapi_spec.get("paths"):
        return base_mcp

    openapi_spec = clean_response_schemas(openapi_spec)

    client = httpx.AsyncClient(base_url=api_base_url)
    return FastMCP.from_openapi(
        openapi_spec=openapi_spec,
        client=client,
        name=SERVER_NAME,
    )


def resolve_mode() -> tuple[str, bool, bool]:
    """Determine which server mode to run based on env."""
    dynamic_enabled = bool(settings.IS_DYNAMIC_ENABLED)
    static_enabled = bool(settings.IS_STATIC_ENABLED)

    if dynamic_enabled and static_enabled:
        return "dynamic-and-static", True, True
    if dynamic_enabled and not static_enabled:
        return "dynamic-only", True, False
    if static_enabled and not dynamic_enabled:
        return "static-only", False, True
    return "disabled", False, False


async def run_server() -> None:
    mode, dynamic_enabled, static_enabled = resolve_mode()

    if mode == "disabled":
        update_agent_status("Failed")
        raise RuntimeError("Both dynamic and static modes are disabled; nothing to run.")

    base_mcp = create_base_mcp()
    mcp = add_openapi_tools(base_mcp) if dynamic_enabled else base_mcp

    pipeline_task = None
    if static_enabled:
        # Single hybrid search tool (returns both snippet + conditional compression).
        from retrieval.hybrid_search import vector_db
        from pipeline.static_pipeline import run_pipeline

        mcp.tool(name="vector_db")(vector_db)
        pipeline_task = asyncio.create_task(run_pipeline(mcp))

    if not pipeline_task:
        update_agent_status("Ready")
    else:
        def _pipeline_done(task: asyncio.Task) -> None:
            try:
                task.result()
                update_agent_status("Ready")
            except Exception:
                update_agent_status("Failed")

        pipeline_task.add_done_callback(_pipeline_done)

    try:
        await mcp.run_async(transport="http", host="0.0.0.0", port=8000)
    except Exception:
        update_agent_status("Failed")
        raise


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
