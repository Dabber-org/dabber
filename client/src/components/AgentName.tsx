"use client";

import { useCustomization } from "@/contexts/CustomizationContext";

export default function AgentName() {
  const { agentName } = useCustomization();
  return <div className="text-xl text-white/90">{agentName}</div>;
}
