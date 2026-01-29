import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { Agent, AgentStatus } from "@/generated/prisma";
import { getStatusColor, getStatusBackground, getStatusText } from "../utils";
import { IconCheck, IconX } from "@tabler/icons-react";

export default function AgentStatusComponent({ agent }: { agent: Agent }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={0.5}
      bgcolor={getStatusBackground(agent.status)}
      borderRadius="0.5rem"
      padding="0.25rem 0.5rem"
      width="fit-content"
    >
      {getStatusIcon(agent.status)}
      <Typography
        variant="fontMediumXs"
        sx={{
          width: "fit-content",
          color: getStatusColor(agent.status),
          textTransform: "none",
        }}
      >
        {getStatusText(agent.status)}
      </Typography>
    </Stack>
  );
}

const getStatusIcon = (status: AgentStatus): React.ReactNode => {
  switch (status) {
    case AgentStatus.READY:
      return <Box component={IconCheck} size={14} sx={{ color: getStatusColor(status) }} />;
    case AgentStatus.INACTIVE:
      return <Box component={IconX} size={14} sx={{ color: getStatusColor(status) }} />;
    case AgentStatus.PENDING:
      return <CircularProgress size={14} sx={{ color: getStatusColor(status) }} />;
  }
};
