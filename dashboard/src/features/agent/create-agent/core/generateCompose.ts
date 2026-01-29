import type { Agent } from "@/generated/prisma";
import { env } from "@/env";

export function generateCompose(agent: Agent) {
  return `
version: "3.9"

services:
  mcp-server:
    image: mcp-server:latest
    environment:
      - API_BASE_URL=${agent.apiBaseUrl}
      - OPENAPI_URL=${agent.openApiUrl}
      - SCRAPING_URL=${agent.scrapingUrl}
      - AGENT_ID=${agent.id}
      - DASHBOARD_URL=http://host.docker.internal:3000
      - IS_STATIC_ENABLED=${agent.isStaticEnabled}
      - IS_DYNAMIC_ENABLED=${agent.isDynamicEnabled}
    ports:
      - "${agent.serverPort}:8000"

  mcp-client:
    image: mcp-client:latest
    environment:
      - SERVER_URL=http://host.docker.internal:${agent.serverPort}/mcp
      - GEMINI_API_KEY=${env.GEMINI_API_KEY}
      - ANTHROPIC_API_KEY=${env.ANTHROPIC_API_KEY}
      - APP_URL=http://localhost:${agent.clientPort}
      - USER_INSTRUCTIONS=${agent.instructions}
      - AGENT_NAME=${agent.name}
    depends_on:
      - mcp-server
    ports:
      - "${agent.clientPort}:3000"
`;
}
// SCRAPING_URL=https://example.com/
// OPENAPI_URL=http://host.docker.internal:3000/api/swagger
// # OPENAPI_URL=http://localhost:3000/api/swagger
// API_BASE_URL="https://example.com/"
