import type { Agent } from "@/generated/prisma";

export function buildEmbedInfo(agent: Agent) {
  const clientUrl = agent.domain
    ? `https://${agent.domain}`
    : `http://localhost:${agent.clientPort}`;

  const iframeEmbed = `<script 
  src="${clientUrl}/api/widget" 
></script>`;

  return {
    clientUrl,
    iframeEmbed,
  };
}
