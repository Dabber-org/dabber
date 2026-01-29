"use client";
import { Box, Button, Stack, Typography, useTheme } from "@mui/material";
import { Agent } from "@/generated/prisma";
import { IconCode, IconDots } from "@tabler/icons-react";
import { getTimeFromDate } from "../agents/utils";
import AgentStatusComponent from "@/features/agent/agents/agents-card/AgentStatus";
import AgentType from "@/features/agent/agents/agents-card/AgentType";
import MainButton from "@/components/MainButton";
import { useState } from "react";
import AgentEmbed from "./agent-embed/AgentEmbed";

export default function AgentDetailHeader({ agent }: { agent: Agent }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="2.5rem" paddingInline="1.5rem" paddingBlock="2rem">
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" alignItems="center" gap="1rem">
          <Box
            component="img"
            src="/DabberBotSmall.svg"
            alt="DabberBotSmall"
            width="4.88825rem"
            height="4.875rem"
            sx={{ objectFit: "contain" }}
          />
          <Stack direction="column" gap={0.5}>
            <Typography variant="fontMediumBase" color="text.secondary" textAlign="start">
              Agent
            </Typography>

            <Typography variant="fontDemiXl" color="text.primary">
              {agent.name}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          <MainButton
            label="Embed Code"
            onClick={() => setOpen(!open)}
            letter="E"
            startIcon={<IconCode />}
            disabled={agent.status === "PENDING"}
          />
          <Button className="opacityOnHover-50">
            <IconDots size={20} color={theme.palette.text.secondary} />
          </Button>
        </Stack>
      </Stack>
      <Stack direction="row" alignItems="center" gap="6.5rem" paddingInline="0.5rem" justifyContent="left">
        {headerItems(agent).map((item) => (
          <Stack key={item.label} gap={0.5}>
            <Typography variant="fontRegularSm" color="text.secondary" textAlign="start">
              {item.label}
            </Typography>
            <Typography variant="fontRegularSm" color="text.primary" textAlign="start">
              {item.value}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <AgentEmbed open={open} setOpen={setOpen} agent={agent} />
    </Stack>
  );
}

const headerItems = (agent: Agent) => [
  {
    label: "Created",
    value: getTimeFromDate(agent.createdAt),
  },
  {
    label: "Status",
    value: <AgentStatusComponent agent={agent} />,
  },
  {
    label: "Type",
    value: <AgentType agent={agent} />,
  },
];
