/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  GoogleGenerativeAI,
  FunctionDeclaration as GFunctionDeclaration,
  SchemaType,
  Part,
  Content,
  TextPart,
  FunctionCallPart,
  FunctionResponsePart,
} from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import { Message } from "./types.js";
import { systemPrompt } from "./prompt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

// Ensure the MCP client advertises both JSON and SSE support when connecting via HTTP.
if (!process.env.FASTMCP_TRANSPORT_REQUESTED_MIME_TYPES) {
  process.env.FASTMCP_TRANSPORT_REQUESTED_MIME_TYPES =
    "application/json,text/event-stream";
}

// Convert JSON Schema to Gemini Schema format (used to identify the parameters of the tools and their types)
function jsonSchemaToGeminiSchema(
  jsonSchema: any,
  definitions?: Record<string, any>
): any {
  if (!jsonSchema || typeof jsonSchema !== "object") {
    return { type: SchemaType.STRING };
  }

  // Handle $ref - resolve or skip
  if (jsonSchema.$ref) {
    if (definitions) {
      const refPath = jsonSchema.$ref
        .replace("#/$defs/", "")
        .replace("#/definitions/", "");
      if (definitions[refPath]) {
        return jsonSchemaToGeminiSchema(definitions[refPath], definitions);
      }
    }
    // If we can't resolve the ref, treat it as a generic object
    return { type: SchemaType.OBJECT, properties: {} };
  }

  const schemaType = jsonSchema.type;

  if (schemaType === "object") {
    const properties: Record<string, any> = {};
    const required = jsonSchema.required || [];

    if (jsonSchema.properties) {
      for (const [key, value] of Object.entries(jsonSchema.properties)) {
        properties[key] = {
          ...jsonSchemaToGeminiSchema(
            value,
            definitions || jsonSchema.$defs || jsonSchema.definitions
          ),
          description: (value as any).description || "",
        };
      }
    }

    return {
      type: SchemaType.OBJECT,
      properties,
      required,
    };
  } else if (schemaType === "array") {
    return {
      type: SchemaType.ARRAY,
      items: jsonSchemaToGeminiSchema(jsonSchema.items, definitions),
    };
  } else if (schemaType === "string") {
    return { type: SchemaType.STRING };
  } else if (schemaType === "number" || schemaType === "integer") {
    return { type: SchemaType.NUMBER };
  } else if (schemaType === "boolean") {
    return { type: SchemaType.BOOLEAN };
  }

  return { type: SchemaType.STRING };
}

// Build Gemini function declarations from MCP tools with proper schemas
function buildFunctionDeclarations(
  tools: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>
): GFunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: jsonSchemaToGeminiSchema(tool.input_schema),
  }));
}

export class GeminiMCPClient {
  private mcp: Client;
  private transport:
    | StdioClientTransport
    | StreamableHTTPClientTransport
    | null = null;
  private tools: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }[] = [];
  private genAI: GoogleGenerativeAI;
  private model: string;
  private systemInstruction: string;

  constructor(systemInstruction?: string) {
    this.mcp = new Client({ name: "mcp-client-gemini", version: "1.0.0" });
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    // If systemInstruction is provided (from env var), append the additional instructions
    if (systemInstruction) {
      this.systemInstruction =
        this.getDefaultSystemInstruction() + "\n" + systemInstruction;
    } else {
      this.systemInstruction = this.getDefaultSystemInstruction();
    }
  }

  // Default prompt given to the OpenAI LLM model
  private getDefaultSystemInstruction(): string {
    return systemPrompt;
  }

  private isUrl(serverPath: string): boolean {
    try {
      const url = new URL(serverPath);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  private isFilePath(serverPath: string): boolean {
    return (
      serverPath.endsWith(".js") ||
      serverPath.endsWith(".py") ||
      serverPath.endsWith(".ts") ||
      serverPath.includes("/") ||
      serverPath.includes("\\")
    );
  }
  // this connects to the server either using an http url or a file path (python, javascript or typescript)
  async connectToServer(serverPathOrUrl: string) {
    try {
      console.log("Connecting to MCP server", serverPathOrUrl);
      if (this.isUrl(serverPathOrUrl)) {
        this.transport = new StreamableHTTPClientTransport(
          new URL(serverPathOrUrl)
        );
        await this.mcp.connect(this.transport);
        console.log("Connected via HTTP transport");
      } else if (this.isFilePath(serverPathOrUrl)) {
        const isJs = serverPathOrUrl.endsWith(".js");
        const isPy = serverPathOrUrl.endsWith(".py");
        const isTs = serverPathOrUrl.endsWith(".ts");

        if (!isJs && !isPy && !isTs) {
          throw new Error("Server script must be a .js, .py, or .ts file");
        }

        const command = isPy
          ? process.platform === "win32"
            ? "python"
            : "python3"
          : process.execPath;

        this.transport = new StdioClientTransport({
          command,
          args: [serverPathOrUrl],
        });
        await this.mcp.connect(this.transport);
        console.log("Connected via stdio transport", {
          command,
          args: [serverPathOrUrl],
        });
      } else {
        throw new Error(
          "Server must be either a URL (http://... or https://...) or a file path (.js, .py, or .ts)"
        );
      }

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description || "",
          input_schema: tool.inputSchema,
        };
      });
      console.log(
        "Discovered tools",
        this.tools.map((t) => t.name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server:", e);
      throw e;
    }
  }

  async processQuery(
    query: string,
    history: Message[] = []
  ): Promise<{ response: string; toolMessages: Message[] }> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: this.systemInstruction,
    });

    const serialize = (content: unknown): string =>
      typeof content === "string" ? content : JSON.stringify(content);

    const toolMessages: Message[] = [];

    // send the message history to the model (including the tool results as well) for context
    const contents: Content[] = [];
    for (const message of history) {
      if (message.role === "user") {
        contents.push({ role: "user", parts: [{ text: message.content }] });
      } else if (message.role === "assistant") {
        contents.push({ role: "model", parts: [{ text: message.content }] });
      } else if (message.role === "mcp-tool") {
        // Include tool results as model context
        const toolResult = message.toolResult
          ? typeof message.toolResult === "string"
            ? message.toolResult
            : JSON.stringify(message.toolResult)
          : message.content;
        contents.push({
          role: "model",
          parts: [
            { text: `[Tool ${message.toolName || "unknown"}: ${toolResult}]` },
          ],
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: query }] });

    const finalText: string[] = [];

    // define the tools and give them to the llm model to use them to call the tools (recursively if need be and up to 8 times)
    const functionDeclarations = buildFunctionDeclarations(this.tools);
    const maxSteps = 8;

    for (let step = 0; step < maxSteps; step++) {
      const response = await model.generateContent({
        contents,
        tools: [{ functionDeclarations }],
      });

      const candidate = response.response?.candidates?.[0];
      const parts: Part[] = candidate?.content?.parts ?? [];

      const textParts: string[] = [];
      let invokedTool = false;

      for (const rawPart of parts) {
        const textCandidate = rawPart as TextPart;
        if (typeof textCandidate.text === "string") {
          textParts.push(textCandidate.text);
          continue;
        }

        const callCandidate = rawPart as FunctionCallPart;
        if (
          callCandidate.functionCall &&
          typeof callCandidate.functionCall === "object"
        ) {
          const call = callCandidate.functionCall as {
            name: string;
            args?: Record<string, unknown>;
          };

          const toolMessageId = uuidv4();
          const toolMessage: Message = {
            id: toolMessageId,
            role: "mcp-tool",
            content: `Calling ${call.name}`,
            timestamp: new Date(),
            toolName: call.name,
            toolArgs: call.args || {},
            toolStatus: "success",
          };

          try {
            const result = await this.mcp.callTool({
              name: call.name,
              arguments: call.args,
            });
            toolMessage.toolResult = result;
            toolMessages.push(toolMessage);

            const funcRespPart: FunctionResponsePart = {
              functionResponse: {
                name: call.name,
                response: { content: serialize(result.content) },
              },
            };
            contents.push({ role: "model", parts: [funcRespPart] });
            invokedTool = true;
          } catch (error) {
            toolMessage.toolStatus = "error";
            toolMessage.toolError =
              error instanceof Error ? error.message : "Unknown error";
            toolMessages.push(toolMessage);
            finalText.push(
              `[Error calling tool ${call.name}: ${toolMessage.toolError}]`
            );
          }
        }
      }

      if (!invokedTool) {
        if (textParts.length > 0) finalText.push(textParts.join("\n"));
        break;
      }
    }

    if (finalText.length === 0)
      finalText.push("No response received from Gemini");
    return { response: finalText.join("\n"), toolMessages };
  }
  // only used for the web app
  async processWebQuery(
    query: string,
    history: Message[] = []
  ): Promise<{ response: string; toolMessages: Message[] }> {
    try {
      return await this.processQuery(query, history);
    } catch (error) {
      console.error("Error processing web query:", error);
      return {
        response: `Sorry, I encountered an error while processing your request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        toolMessages: [],
      };
    }
  }

  async cleanup() {
    console.log("Cleaning up MCP client");
    await this.mcp.close();
  }
}
