import { prisma } from "@/core/db/prisma";
import { stopDockerCompose } from "@/core/docker/execCompose";
import fs from "node:fs/promises";
import path from "node:path";

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

  const baseDir = path.join(process.cwd(), "deployments");
  const dir = path.join(baseDir, agentId);
  const composePath = path.join(dir, "docker-compose.yml");

  try {
    await stopDockerCompose(composePath);
  } catch (error) {
    console.error(`Error stopping Docker containers for agent ${agentId}:`, error);
  }

  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error removing deployment directory for agent ${agentId}:`, error);
  }

  return prisma.agent.delete({
    where: { id: agentId },
  });
};
