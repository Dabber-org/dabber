import { NextResponse } from "next/server";
import { getAgent } from "@/features/agent/agents/core/get-agent";
import { updateAgent } from "@/features/agent/agents/core/update-agent";
import { deleteAgent } from "@/features/agent/agents/core/delete-agent";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user.id as string;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const agent = await getAgent({ agentId: id, userId });
    return NextResponse.json(agent);
  } catch (err: any) {
    console.error("Error getting agent:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await req.json();
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user.id as string;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const agent = await updateAgent({
      agentId: id,
      userId,
      ...json,
    });
    return NextResponse.json(agent);
  } catch (err: any) {
    console.error("Error updating agent:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user.id as string;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await deleteAgent({ agentId: id, userId });
    return NextResponse.json({ message: "Agent deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting agent:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
