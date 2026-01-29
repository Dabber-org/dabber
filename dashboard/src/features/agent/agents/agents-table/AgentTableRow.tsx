"use client";
import { Stack, TableCell, TableRow, IconButton, Box, Menu, useTheme } from "@mui/material";
import { IconDots } from "@tabler/icons-react";
import { Agent } from "@/generated/prisma";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AgentCreated from "@/features/agent/agents/agents-card/AgentCreated";
import AgentName from "@/features/agent/agents/agents-card/AgentName";
import AgentType from "@/features/agent/agents/agents-card/AgentType";
import AgentStatusComponent from "@/features/agent/agents/agents-card/AgentStatus";
import DeleteAgents from "./DeleteAgents";

export default function AgentTableRow({ agent }: { agent: Agent }) {
  const router = useRouter();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <TableRow
      onClick={() => router.push(`/agents/${agent.id}`)}
      sx={{
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "background.subtle",
        },
        borderBottom: (theme) => `0.15rem solid ${theme.palette.border.default}`,
      }}
    >
      <TableCell>
        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            component="img"
            src="/DabberBotSmall.svg"
            alt="DabberBotSmall"
            width="1.75475rem"
            height="1.75475rem"
            sx={{ objectFit: "contain" }}
          />

          <AgentName agent={agent} />
        </Stack>
      </TableCell>

      <TableCell>
        <AgentType agent={agent} />
      </TableCell>

      <TableCell>
        <AgentStatusComponent agent={agent} />
      </TableCell>

      <TableCell>
        <AgentCreated agent={agent} />
      </TableCell>

      <TableCell align="right">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "text.primary",
            },
          }}
        >
          <IconDots size={20} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={(e) => e.stopPropagation()}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.surface,
              borderRadius: "0.75rem",
              minWidth: "10rem",
              mt: 0.5,
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
            },
          }}
        >
          <DeleteAgents agent={agent} onClose={handleClose} />
        </Menu>
      </TableCell>
    </TableRow>
  );
}
