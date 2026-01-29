import { Stack } from "@mui/material";
import { Agent } from "@/generated/prisma";
import { getAgentTypes } from "../utils";
import AgentTypeCard from "./AgentTypeCard";

export default function AgentType({ agent }: { agent: Agent }) {
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {getAgentTypes(agent)
        .sort()
        .map((type) => (
          <AgentTypeCard key={type} type={type} />
        ))}
    </Stack>
  );
}
