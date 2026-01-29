import { Agent } from "@/generated/prisma";

export const fetchAgent = async (agentId: string): Promise<Agent> => {
  const response = await fetch(`/api/agents/${agentId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch agent");
  }

  return response.json();
};
