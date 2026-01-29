import { prisma } from "@/core/db/prisma";
import { AgentStatus } from "@/generated/prisma";

type UpdateAgentProps = {
  agentId: string;
  userId: string;
  name?: string;
  status?: AgentStatus;
  scrapingUrl?: string | null;
  openApiUrl?: string | null;
  apiBaseUrl?: string | null;
};

export const updateAgent = async ({
  agentId,
  userId,
  name,
  status,
  scrapingUrl,
  openApiUrl,
  apiBaseUrl,
}: UpdateAgentProps) => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  if (agent.userId !== userId) {
    throw new Error("You don't have permission to update this agent");
  }

  return prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(name && { name }),
      ...(status && { status }),
      ...(scrapingUrl !== undefined && { scrapingUrl }),
      ...(openApiUrl !== undefined && { openApiUrl }),
      ...(apiBaseUrl !== undefined && { apiBaseUrl }),
    },
  });
};
