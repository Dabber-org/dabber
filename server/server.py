import asyncio

import httpx
from fastmcp import FastMCP

from config import settings
from core.static_pipeline import run_pipeline
import requests
from tools.vector_search import search_vector_db

SERVER_NAME = "Dabber MCP Server"


def update_agent_status(status: str):
    """Send agent status updates to the dashboard."""
    url = f"{settings.DASHBOARD_URL}/api/agents/{settings.AGENT_ID}/status"
    data = {"status": status.upper()}
    requests.patch(url, json=data)


def create_base_mcp() -> FastMCP:
    """Create the base MCP server without any generated tools."""
    return FastMCP(SERVER_NAME)


def clean_response_schemas(spec):
    """Remove response schemas that cause validation errors"""
    if "paths" in spec:
        for path_data in spec["paths"].values():
            for operation in path_data.values():
                if isinstance(operation, dict) and "responses" in operation:
                    for response in operation["responses"].values():
                        if "content" in response:
                            # Remove response schemas - we only need request schemas for tool calling
                            response["content"] = {}
    return spec


def add_openapi_tools(base_mcp: FastMCP) -> FastMCP:
    """
    Add generated OpenAPI tools to the server if configured and available.
    Returns the augmented server; if no API base URL is set or no paths exist, returns the base server.
    """
    api_base_url = (settings.API_BASE_URL or "").strip()

    if not api_base_url:
        return base_mcp

    openapi_spec = httpx.get(settings.OPENAPI_URL).json()
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
    openapi_set = settings.IS_DYNAMIC_ENABLED.lower()=="true"
    scraping_set = settings.IS_STATIC_ENABLED.lower()=="true"

    if openapi_set and scraping_set:
        return "dynamic-and-static", True, True
    if openapi_set and not scraping_set:
        return "dynamic-only", True, False
    if scraping_set and not openapi_set:
        return "static-only", False, True
    return "disabled", False, False


async def run_server():
    mode, dynamic_enabled, static_enabled = resolve_mode()

    if mode == "disabled":
        update_agent_status("Failed")
        raise RuntimeError("Both OPENAPI_URL and SCRAPING_URL are empty; nothing to run.")

    base_mcp = create_base_mcp()
    mcp = add_openapi_tools(base_mcp) if dynamic_enabled else base_mcp

    pipeline_task = None
    if static_enabled:
        pipeline_task = asyncio.create_task(run_pipeline(mcp))


    if not pipeline_task:
        # If no pipeline, mark ready before serving
        update_agent_status("Ready")
    else:
        # Update status based on pipeline result
        def _pipeline_done(task: asyncio.Task):
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


def main():
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
