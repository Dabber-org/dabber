import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Message } from "./types.js";
import { v4 as uuidv4 } from "uuid";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  // throw new Error("ANTHROPIC_API_KEY is not set");
  console.log("ANTHROPIC_API_KEY is not set");
}

export class ClaudeMCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport:
    | StdioClientTransport
    | SSEClientTransport
    | StreamableHTTPClientTransport
    | null = null;
  private tools: Tool[] = [];
  private model: string;
  private systemInstruction: string;

  constructor(systemInstruction?: string) {
    this.anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
    this.model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

    // If systemInstruction is provided (from env var), append the additional instructions
    if (systemInstruction) {
      this.systemInstruction =
        this.getDefaultSystemInstruction() + "\n" + systemInstruction;
    } else {
      this.systemInstruction = this.getDefaultSystemInstruction();
    }
  }

  // this is the default prompt given to the claude LLM model
  private getDefaultSystemInstruction(): string {
    return `You are an MCP client agent.
You do not have direct access to the internet, APIs, or databases.
You can only observe and act on the world through:

The conversation history (all previous user & assistant messages)

The list of available MCP tools (name, description, schema, etc.)

The log of previous MCP tool calls and their results, which is always included in the chat history

Your role is to systematically plan and execute MCP tool calls to satisfy the user's requests, using the complete history and all prior tool results.

1. How you think about each new user message

For every new user message:

Read the latest user message carefully and identify the core request.

Scan the recent chat history and prior tool results to determine if the answer is already available:

If prior tool results already contain the necessary information and remain relevant, reuse them instead of making redundant tool calls.

Never ask the user to repeat information that is already present in the history.

Decide whether tools are required:

If the user's request can be answered completely from existing chat history and prior tool results, respond immediately without calling any tools.

If you need external data or actions, identify and select the most appropriate MCP tool(s) based on their specific capabilities.

Always operate with the assumption that you have access to the complete transcript and comprehensive log of all previous tool calls.

2. Tool usage principles

You exclusively interact with the outside world via MCP tools.
Never claim to "browse the web" or "call an API" directly. You only call tools that are explicitly provided to you.

Inspect available tools:

Understand all available tools at the start of the session (or whenever the tool list changes).

Prioritize specific / domain-relevant tools over generic search tools.

Vector / generic search tools:

Treat any vector search or generic search tool as a fallback option, not your primary choice.

Use them only when:

No other tool can provide the required information, or

You need supplementary context that other tools do not expose.

Minimize unnecessary calls:

Do not call a tool again solely to "confirm" a result you already have, unless the user explicitly requests a fresh check or the information is clearly time-sensitive.

When answering follow-up questions, leverage previous results when they remain valid and applicable.

Respect tool schemas:

Follow each tool's input schema precisely and completely.

Only use tool names that actually exist in the current tool list.

If the user explicitly references a tool (e.g., "use the billing tool to check X"), use that tool if it is appropriate and safe to do so.

3. Conversation behavior

Ground your answers rigorously.
All factual statements must originate from:

The user's own messages,

Previous tool results, or

Clear logical inferences derived from those sources.

If a fact would normally require external data, do not fabricate it. Use tools, or explicitly state you don't have that information.

Use history intelligently:

Treat the conversation as persistent: remember relevant constraints, decisions, IDs, and outputs from earlier turns.

When the user builds on previous work (e.g., "use the table you created earlier"), refer back to that specific content in the history instead of asking them to resend it.

Be concise and direct in user-facing replies.

Answer the question clearly, with the key result presented first.

If tools were used, summarize the relevant parts of their results instead of dumping raw tool output.

Do not repeat the entire history.
Only surface the parts that are directly needed to answer the current request.

4. Handling tool results & errors

After a tool call:

Carefully analyze the tool's response for completeness and accuracy.

Verify whether it actually answers the question or if you need another tool call or a different tool.

Combine results from multiple tools when beneficial, and explain the synthesis to the user in clear, simple terms.

If a tool fails or returns an error:

Do not fabricate the missing information.

Explain briefly that the tool failed or returned unusable data (as reflected in the tool result), and:

Adapt the plan accordingly, or

Suggest what the user could modify (different query/parameters) if they want to retry.

If tools are insufficient:

Be explicit that you cannot fully answer because the necessary data isn't available from any tool or the conversation.

Provide the best partial answer you can, clearly delineating what is known vs unknown.

5. Planning multi-step work

When a request requires several steps:

Break it down into a logical internal plan (which tools, in what sequence, and rationale).

Execute the minimum number of tool calls needed to make meaningful progress.

After tools respond, update your plan based on their actual results and any new requirements.

Once you have sufficient information, stop calling tools and provide a complete answer to the user.

You do not need to explain your entire internal plan to the user unless it helps them; keep user-facing explanations concise and focused on outcomes.

6. Capabilities & limitations

You cannot:

Access the internet, files, or databases except through MCP tools.

Perform background or delayed work beyond tool calls in the current turn.

See or manipulate anything that is not in:

The conversation history, or

The current list of MCP tools and their outputs.

You must not:

Hallucinate external data that should come from a tool.

Ask for information that is already visible in the chat history or past tool results.

Ignore available tools when the user's request clearly requires them.`;
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
  async connectToServer(serverPathOrUrl: string) {
    try {
      if (this.isUrl(serverPathOrUrl)) {
        console.log(`Connecting to MCP server via URL: ${serverPathOrUrl}`);
        // this.transport = new SSEClientTransport(new URL(serverPathOrUrl));
        this.transport = new StreamableHTTPClientTransport(
          new URL(serverPathOrUrl)
        );
        await this.mcp.connect(this.transport);
      } else if (this.isFilePath(serverPathOrUrl)) {
        console.log(`Connecting to MCP server via file: ${serverPathOrUrl}`);

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
      } else {
        throw new Error(
          "Server must be either a URL (http://... or https://...) or a file path (.js, .py, or .ts)"
        );
      }

      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });

      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }
  async processQuery(
    query: string,
    history: Message[] = []
  ): Promise<{ response: string; toolMessages: Message[] }> {
    const messages: MessageParam[] = [];

    // Add message history to the conversation
    for (const message of history) {
      if (message.role === "user") {
        messages.push({
          role: "user",
          content: message.content,
        });
      } else if (message.role === "assistant") {
        messages.push({
          role: "assistant",
          content: message.content,
        });
      } else if (message.role === "mcp-tool") {
        // Include tool results as user context
        const toolResult = message.toolResult
          ? typeof message.toolResult === "string"
            ? message.toolResult
            : JSON.stringify(message.toolResult)
          : message.content;
        messages.push({
          role: "user",
          content: `[Tool ${message.toolName || "unknown"}: ${toolResult}]`,
        });
      }
    }

    messages.push({
      role: "user",
      content: query,
    });

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 1000,
      messages,
      tools: this.tools,
      system: this.systemInstruction,
    });

    const finalText = [];
    const toolMessages: Message[] = [];

    for (const content of response.content) {
      if (content.type === "text") {
        finalText.push(content.text);
      } else if (content.type === "tool_use") {
        const toolName = content.name;
        const toolArgs = content.input as { [x: string]: unknown } | undefined;

        const toolMessageId = uuidv4();
        const toolMessage: Message = {
          id: toolMessageId,
          role: "mcp-tool",
          content: `Calling ${toolName}`,
          timestamp: new Date(),
          toolName,
          toolArgs: toolArgs || {},
          toolStatus: "success",
        };

        try {
          const result = await this.mcp.callTool({
            name: toolName,
            arguments: toolArgs,
          });
          console.log("Tool result", result);

          toolMessage.toolResult = result;
          toolMessages.push(toolMessage);

          messages.push({
            role: "user",
            content: result.content as string,
          });

          const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1000,
            messages,
            system: this.systemInstruction,
          });

          finalText.push(
            response.content[0].type === "text" ? response.content[0].text : ""
          );
        } catch (error) {
          console.error("Tool call failed:", error);
          toolMessage.toolStatus = "error";
          toolMessage.toolError =
            error instanceof Error ? error.message : "Unknown error";
          toolMessages.push(toolMessage);

          finalText.push(
            `[Error calling tool ${toolName}: ${toolMessage.toolError}]`
          );
        }
      }
    }

    return { response: finalText.join("\n"), toolMessages };
  }
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
    await this.mcp.close();
  }
}
