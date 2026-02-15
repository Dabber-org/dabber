import { createMCPClient } from "@ai-sdk/mcp";
import { env } from "@/env";

type MCPClientInstance = Awaited<ReturnType<typeof createMCPClient>>;

let mcpClient: MCPClientInstance | null = null;
let connectionPromise: Promise<MCPClientInstance> | null = null;

async function connectMCPClient(): Promise<MCPClientInstance> {
  const serverUrl = env.SERVER_URL || "http://localhost:8000/mcp";
  console.log(`Connecting to MCP server at ${serverUrl}`);

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: serverUrl,
    },
  });

  console.log("Connected to MCP server");
  return client;
}

export async function getMCPTools() {
  if (!mcpClient) {
    if (!connectionPromise) {
      connectionPromise = connectMCPClient()
        .then((client) => {
          mcpClient = client;
          connectionPromise = null;
          return client;
        })
        .catch((err) => {
          connectionPromise = null;
          throw err;
        });
    }
    await connectionPromise;
  }

  try {
    return await mcpClient!.tools();
  } catch {
    // Connection may have dropped — reset and retry once
    mcpClient = null;
    connectionPromise = null;
    const client = await connectMCPClient();
    mcpClient = client;
    return await client.tools();
  }
}
