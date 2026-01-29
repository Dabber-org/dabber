import { useMemo } from "react";
import { Agent } from "@/generated/prisma";
import { getStatusFromDropdownValue } from "../utils";
import { getAgentTypes } from "../utils";

export const useFilterAgents = (agents: Agent[], searchQuery: string, status: string, type: string) => {
  return useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase());
      const statusEnum = getStatusFromDropdownValue(status);
      const matchesStatus = status === "all" || agent.status === statusEnum;
      const agentTypes = getAgentTypes(agent).join(", ").toLowerCase();
      const matchesType = type === "all" || agentTypes.includes(type.toLowerCase());
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [agents, searchQuery, status, type]);
};
