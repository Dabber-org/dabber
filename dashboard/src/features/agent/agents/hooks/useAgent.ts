"use client";
import useSWR from "swr";
import { Agent } from "@/generated/prisma";
import { fetchAgent } from "../services/get-agent";

export const useAgent = (agentId: string | null | undefined) => {
  const { data, error, isLoading, mutate } = useSWR<Agent>(
    agentId ? `/api/agents/${agentId}` : null,
    () => fetchAgent(agentId!),
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    agent: data ?? null,
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    refetch: mutate,
  };
};
