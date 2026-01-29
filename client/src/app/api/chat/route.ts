import { NextRequest, NextResponse } from "next/server";
import { GeminiMCPClient } from "../../../mcp/geminiClient";
import { ClaudeMCPClient } from "../../../mcp/claudeClient";
import { OpenAIMCPClient } from "../../../mcp/openAiClient";
import { ChatResponse, Message } from "../../../mcp/types";

// Store MCP client instances globally to reuse connections
let geminiClient: GeminiMCPClient | null = null;
let claudeClient: ClaudeMCPClient | null = null;
let openAiClient: OpenAIMCPClient | null = null;

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      messages: history,
      llmType = "gemini",
    } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // System instruction is controlled server-side via environment variable
    const systemInstruction = process.env.USER_INSTRUCTIONS;

    let response: string;
    let toolMessages: Message[];

    if (llmType === "gemini") {
      if (!geminiClient) {
        geminiClient = new GeminiMCPClient(systemInstruction);
        try {
          await geminiClient.connectToServer(
            process.env.SERVER_URL || "http://localhost:8000/mcp"
          );
          console.log("🔗 Connected to Gemini MCP server");
        } catch (error) {
          console.error("Failed to connect to Gemini MCP server:", error);
          return NextResponse.json(
            { error: "Failed to connect to Gemini MCP server" },
            { status: 500 }
          );
        }
      }
      const result = await geminiClient.processWebQuery(
        message,
        Array.isArray(history) ? history : []
      );
      response = result.response;
      toolMessages = result.toolMessages;
    } else if (llmType === "claude") {
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
          { error: "Claude is disabled until ANTHROPIC_API_KEY is configured" },
          { status: 503 }
        );
      }
      if (!claudeClient) {
        claudeClient = new ClaudeMCPClient(systemInstruction);
        try {
          await claudeClient.connectToServer(
            process.env.SERVER_URL || "http://localhost:8000/mcp"
          );
          console.log("🔗 Connected to Claude MCP server");
        } catch (error) {
          console.error("Failed to connect to Claude MCP server:", error);
          return NextResponse.json(
            { error: "Failed to connect to Claude MCP server" },
            { status: 500 }
          );
        }
      }
      const result = await claudeClient.processWebQuery(
        message,
        Array.isArray(history) ? history : []
      );
      response = result.response;
      toolMessages = result.toolMessages;
    } else if (llmType === "openai") {
      if (!openAiClient) {
        openAiClient = new OpenAIMCPClient(systemInstruction);
        try {
          await openAiClient.connectToServer(
            process.env.SERVER_URL || "http://localhost:8000/mcp"
          );
          console.log("🔗 Connected to OpenAI MCP server");
        } catch (error) {
          console.error("Failed to connect to OpenAI MCP server:", error);
          return NextResponse.json(
            { error: "Failed to connect to OpenAI MCP server" },
            { status: 500 }
          );
        }
      }
      const result = await openAiClient.processWebQuery(
        message,
        Array.isArray(history) ? history : []
      );
      response = result.response;
      toolMessages = result.toolMessages;
    } else {
      return NextResponse.json(
        {
          error: `Unsupported llmType '${llmType}'. Use 'gemini', 'claude', or 'openai'.`,
        },
        { status: 400 }
      );
    }

    const chatResponse: ChatResponse = {
      message: response,
      toolMessages: toolMessages,
    };

    return NextResponse.json(chatResponse, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error) {
    console.error("Error processing chat request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { status: "Chat API is running" },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
