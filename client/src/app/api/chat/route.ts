import { streamText, UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { getModel } from "@/lib/providers";
import { getMCPTools } from "@/lib/mcp";
import { systemPrompt } from "@/mcp/prompt";
import { env } from "@/env";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const {
      messages,
      llmType = "openai",
    }: {
      messages: UIMessage[];
      llmType?: string;
    } = await req.json();

    const model = getModel(llmType);
    const tools = await getMCPTools();

    const system = env.USER_INSTRUCTIONS
      ? `${systemPrompt}\n\n${env.USER_INSTRUCTIONS}`
      : systemPrompt;

    const result = streamText({
      model,
      system,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(10),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
