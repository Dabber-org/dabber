import { prisma } from "@/core/db/prisma";

type GetAgentProps = {
  agentId: string;
  userId: string;
};

export const getAgent = async ({ agentId, userId }: GetAgentProps) => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  if (agent.userId !== userId) {
    throw new Error("You don't have permission to access this agent");
  }

  return agent;
};
