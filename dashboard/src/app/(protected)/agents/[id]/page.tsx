"use client";
import { useParams } from "next/navigation";
import { useAgent } from "@/features/agent/agents/hooks/useAgent";
import { Stack } from "@mui/material";
import AgentDetailLoading from "@/features/agent/agent-detail/AgentDetailLoading";
import AgentDetailError from "@/features/agent/agent-detail/AgentDetailError";
import AgentDetailHeader from "@/features/agent/agent-detail/AgentDetailHeader";
import AgentDetail from "@/features/agent/agent-detail/AgentDetail";
export default function AgentPage() {
  const { id } = useParams();
  const { agent, isLoading } = useAgent(id as string);

  if (isLoading) {
    return <AgentDetailLoading />;
  }

  if (!agent) {
    return <AgentDetailError error="Agent not found" />;
  }

  return (
    <Stack>
      <AgentDetailHeader agent={agent} />
      <AgentDetail agent={agent} />
    </Stack>
  );
}
