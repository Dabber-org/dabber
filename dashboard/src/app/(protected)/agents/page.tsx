import { Stack } from "@mui/material";
import Agents from "@/features/agent/agents/Agents";
import { getAgents } from "@/features/agent/agents/core/get-agents";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function AgentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user.id as string;
  if (!userId) {
    return <div>Unauthorized</div>;
  }
  const agents = await getAgents(userId);

  return (
    <Stack gap={1}>
      <Agents initialAgents={agents} />
    </Stack>
  );
}
