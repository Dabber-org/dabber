import { NextResponse } from "next/server";
import { getAgent } from "@/features/agent/agents/core/get-agent";
import { buildEmbedInfo } from "@/features/agent/create-agent/core/embed";
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
    const { clientUrl, iframeEmbed } = buildEmbedInfo(agent);
    return NextResponse.json({
      agent,
      clientUrl,
      iframeEmbed,
    });
  } catch (err: any) {
    console.error("Error getting agent embed:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
