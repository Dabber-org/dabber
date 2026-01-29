import { auth } from "./auth";
import { Agent } from "@/generated/prisma";

export async function createApiKey(agent: Agent, userId: string) {
  const apiKey = await auth.api.createApiKey({
    body: {
      name: `agent-key-${agent.id}`,
      expiresIn: 60 * 60 * 24 * 7, // 1 week
      userId: userId,
      prefix: "agent_", // Better to include underscore for clarity
      remaining: 100,
      metadata: {
        agentId: agent.id,
        createdFor: "agent-automation",
      },
      permissions: {
        // Define specific resource permissions
        agents: ["read", "write"],
        data: ["read"],
      },
    },
  });
  return apiKey;
}
