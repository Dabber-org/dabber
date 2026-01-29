import { CreateAgentProps, CreateAgentResponse } from "./types";
import { Agent } from "@/generated/prisma";

export const createAgent = async (agent: CreateAgentProps): Promise<Agent> => {
  const response = await fetch(`/api/agents/create`, {
    method: "POST",
    body: JSON.stringify(agent),
  });

  if (!response.ok) {
    throw new Error("Failed to create agent");
  }

  const data: CreateAgentResponse = await response.json();
  return data.agent;
};
