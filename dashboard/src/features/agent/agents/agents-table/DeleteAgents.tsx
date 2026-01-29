"use client";
import { MenuItem, Stack, Typography, useTheme } from "@mui/material";
import { IconTrash } from "@tabler/icons-react";
import { Agent } from "@/generated/prisma";
import { mutate } from "swr";

export default function DeleteAgents({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const theme = useTheme();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete agent");
      }

      mutate("/api/agents");
    } catch (error) {
      console.error("Error deleting agent:", error);
    }
  };

  return (
    <MenuItem
      onClick={handleDelete}
      sx={{
        "&:hover": {
          backgroundColor: "background.subtle",
        },
      }}
    >
      <Stack direction="row" alignItems="center" gap={1}>
        <IconTrash size={18} color={theme.palette.status.error.main} />
        <Typography variant="fontMediumSm" color={theme.palette.status.error.main}>
          Delete Agent
        </Typography>
      </Stack>
    </MenuItem>
  );
}
