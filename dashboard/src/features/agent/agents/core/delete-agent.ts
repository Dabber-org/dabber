import { prisma } from "@/core/db/prisma";
import { getDeploymentStrategy } from "@/core/agents-deployment";

type DeleteAgentProps = {
  agentId: string;
  userId: string;
};

export const deleteAgent = async ({ agentId, userId }: DeleteAgentProps) => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  if (agent.userId !== userId) {
    throw new Error("You don't have permission to delete this agent");
  }

  const strategy = getDeploymentStrategy();
  await strategy.teardown(agent);

  return prisma.agent.delete({
    where: { id: agentId },
  });
};
