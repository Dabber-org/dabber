import { Stack, Typography } from "@mui/material";
import { Agent } from "@/generated/prisma";

export default function AgentName({ agent }: { agent: Agent }) {
  return (
    <Stack>
      <Typography variant="fontDemiXl" color="text.primary">
        {agent.name}
      </Typography>
    </Stack>
  );
}
