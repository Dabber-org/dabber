import { prisma } from "@/core/db/prisma";
import { AgentStatus } from "@/generated/prisma";

type UpdateAgentProps = {
  agentId: string;
  status?: AgentStatus;
};

export const updateAgentStatus = async ({ agentId, status }: UpdateAgentProps) => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  return prisma.agent.update({
    where: { id: agentId },
    data: {
      ...(status && { status }),
    },
  });
};
