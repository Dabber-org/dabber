import { Stack, Typography } from "@mui/material";
import { Agent } from "@/generated/prisma";
import { getTimeFromDate } from "../utils";

export default function AgentCreated({ agent }: { agent: Agent }) {
  return (
    <Stack>
      <Typography variant="fontMediumXs" color="text.primary">
        {getTimeFromDate(agent.createdAt)}
      </Typography>
    </Stack>
  );
}
