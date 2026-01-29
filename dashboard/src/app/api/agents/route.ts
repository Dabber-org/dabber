import { NextResponse } from "next/server";
import { getAgents } from "@/features/agent/agents/core/get-agents";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user.id as string;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const agents = await getAgents(userId);
    return NextResponse.json(agents);
  } catch (err: any) {
    console.error("Error getting agents:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
