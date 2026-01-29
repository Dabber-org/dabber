"use client";
import { Stack, Typography, Box, CircularProgress } from "@mui/material";
import { Agent } from "@/generated/prisma";
import { useState } from "react";
import AgentsHeader from "./agents-header/AgentsHeader";
import { useFilterAgents } from "./hooks/useFilterAgents";
import AgentsTable from "./agents-table/AgentsTable";
import { useAgents } from "./hooks/useAgents";

export default function Agents({ initialAgents }: { initialAgents?: Agent[] }) {
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Use SWR to track agent status with initial data from server
  const { agents, isLoading } = useAgents(initialAgents);

  const filteredAgents = useFilterAgents(agents, searchQuery, status, type);
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };
  const handleStatusChange = (value: string) => {
    setStatus(value);
  };
  const handleTypeChange = (value: string) => {
    setType(value);
  };

  // Show loading only if we don't have initial data
  if (isLoading && !initialAgents) {
    return (
      <Stack width="100%" alignItems="center" justifyContent="center" minHeight="400px">
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack width="100%" gap="1rem">
      <AgentsHeader
        onChange={handleSearch}
        status={status}
        onChangeStatus={handleStatusChange}
        type={type}
        onChangeType={handleTypeChange}
      />

      <AgentsTable agents={filteredAgents} />
      <Box>
        <Typography variant="fontMediumSm" color="text.muted">
          Page 1 - {filteredAgents.length} of {filteredAgents.length} Agents
        </Typography>
      </Box>
    </Stack>
  );
}
