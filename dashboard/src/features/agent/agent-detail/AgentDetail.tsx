import { Stack, styled, Typography } from "@mui/material";
import { Agent } from "@/generated/prisma";

import { DynamicIntegrationCard } from "./AgentDetailCards";
import { StaticIntegrationCard } from "./AgentDetailCards";
export default function AgentDetail({ agent }: { agent: Agent }) {
  return (
    <StyledStack width="100%" gap="1.94rem" paddingInline="">
      <Stack direction="row" alignItems="center" gap="0.75rem">
        <Typography variant="fontDemiXl" color="text.primary">
          Configuration
        </Typography>
      </Stack>
      <Stack direction="column" gap="1.94rem">
        <DynamicIntegrationCard agent={agent} />
        <StaticIntegrationCard agent={agent} />
      </Stack>
    </StyledStack>
  );
}

const StyledStack = styled(Stack)(({ theme }) => ({
  border: `1px solid ${theme.palette.border.default}`,
  borderRadius: "1.5rem",
  padding: "1.5rem",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    width: "0.25rem",
    height: "2rem",
    backgroundColor: theme.palette.border.primary,
    borderRadius: "0 0.125rem 0.125rem 0",
  },
}));
