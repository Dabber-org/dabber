import { NextResponse } from "next/server";
import { updateAgentStatus } from "@/features/agent/agents/core/update-agent-status";
import { updateAgentStatusSchema } from "@/features/agent/create-agent/types";
import { getStatusFromLabel } from "@/features/agent/agents/utils";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await req.json();
    const parsed = updateAgentStatusSchema.parse(json);

    const updated = await updateAgentStatus({
      agentId: id,
      status: getStatusFromLabel(parsed.status),
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Error updating agent:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
