import { TableBody } from "@mui/material";

import { Paper, Table, TableContainer } from "@mui/material";
import AgentTableRow from "./AgentTableRow";
import AgentsTableHeader from "./AgentsTableHeader";
import { Agent } from "@/generated/prisma";
import EmptyAgents from "../EmptyAgents";
export default function AgentsTable({ agents }: { agents: Agent[] }) {
  const isAgentsEmpty = agents.length === 0;

  if (isAgentsEmpty) {
    return <EmptyAgents />;
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: "0.75rem",
        mt: "1rem",
      }}
    >
      <Table>
        <AgentsTableHeader />
        <TableBody sx={{ backgroundColor: "background.default" }}>
          {agents.map((agent) => (
            <AgentTableRow key={agent.id} agent={agent} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
