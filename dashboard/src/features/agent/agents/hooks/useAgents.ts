"use client";
import useSWR from "swr";
import { Agent } from "@/generated/prisma";
import { getAgents } from "../services/get-agents";

export const useAgents = (initialData?: Agent[]) => {
  const { data, error, isLoading, mutate } = useSWR<Agent[]>("/api/agents", getAgents, {
    fallbackData: initialData,
    refreshInterval: 5000, // Poll every 5 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  return {
    agents: data ?? [],
    isLoading,
    isError: !!error,
    error: error as Error | undefined,
    mutate,
  };
};
