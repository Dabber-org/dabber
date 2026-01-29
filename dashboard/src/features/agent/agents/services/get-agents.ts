import { Agent } from "@/generated/prisma";

export const getAgents = async (): Promise<Agent[]> => {
  const response = await fetch("/api/agents");

  if (!response.ok) {
    throw new Error("Failed to fetch agents");
  }

  return response.json();
};
