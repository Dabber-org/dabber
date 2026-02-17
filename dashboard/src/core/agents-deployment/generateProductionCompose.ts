import type { Agent } from "@/generated/prisma";
import { env } from "@/env";

export function generateProductionCompose(): string {
  return `version: "3.9"

networks:
  dokploy-network:
    external: true
  internal:
    driver: overlay

services:
  mcp-server:
    image: ghcr.io/mohanedwalid05/mcp-server:latest
    networks:
      - internal
    environment:
      - API_BASE_URL=\${API_BASE_URL}
      - OPENAPI_URL=\${OPENAPI_URL}
      - SCRAPING_URL=\${SCRAPING_URL}
      - AGENT_ID=\${AGENT_ID}
      - DASHBOARD_URL=https://dashboard.dabber.qa
      - IS_STATIC_ENABLED=\${IS_STATIC_ENABLED}
      - IS_DYNAMIC_ENABLED=\${IS_DYNAMIC_ENABLED}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - QDRANT_URL=http://qdrant:6333
    deploy:
      labels:
        - "traefik.enable=false"
      restart_policy:
        condition: on-failure

  mcp-client:
    image: ghcr.io/mohanedwalid05/mcp-client:latest
    networks:
      - internal
      - dokploy-network
    environment:
      - SERVER_URL=http://mcp-server:8000/mcp
      - APP_URL=\${APP_URL}
      - USER_INSTRUCTIONS=\${USER_INSTRUCTIONS}
      - AGENT_NAME=\${AGENT_NAME}
      - HOSTNAME=0.0.0.0
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    deploy:
      labels:
        - "traefik.enable=true"
      restart_policy:
        condition: on-failure

  qdrant:
    image: qdrant/qdrant:latest
    networks:
      - internal
    volumes:
      - qdrant_storage:/qdrant/storage
    deploy:
      labels:
        - "traefik.enable=false"
      restart_policy:
        condition: on-failure

volumes:
  qdrant_storage:
`;
}

export function buildComposeEnv(agent: Agent, domain: string): string {
  const vars: Record<string, string> = {
    AGENT_ID: agent.id,
    API_BASE_URL: agent.apiBaseUrl ?? "",
    OPENAPI_URL: agent.openApiUrl ?? "",
    SCRAPING_URL: agent.scrapingUrl ?? "",
    IS_STATIC_ENABLED: String(agent.isStaticEnabled),
    IS_DYNAMIC_ENABLED: String(agent.isDynamicEnabled),
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    APP_URL: `https://${domain}`,
    USER_INSTRUCTIONS: agent.instructions ?? "You are a helpful assistant",
    AGENT_NAME: agent.name,
  };

  return Object.entries(vars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}
