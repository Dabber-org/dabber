import { createAgentSchema } from "@/features/agent/create-agent/types";
import { NextResponse } from "next/server";
import { createAgent } from "@/features/agent/create-agent/core/create";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    console.log("Creating agent");
    const json = await req.json();
    const parsed = createAgentSchema.parse(json);
    console.log("Parsed data:", parsed);
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const userId = session?.user.id as string;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const agent = await createAgent({
      userId,
      ...parsed,
    });
    console.log("Agent created:", agent);
    return NextResponse.json(agent);
  } catch (err: any) {
    console.error("Error creating agent:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
