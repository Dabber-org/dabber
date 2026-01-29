/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { systemPrompt } from "./prompt";
import { Message } from "./types";
import { v4 as uuidv4 } from "uuid";

// Tool type for OpenAI function calling
interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Tool call structure from OpenAI response
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.log("OPENAI_API_KEY is not set");
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.1";
const MAX_TOOL_ITERATIONS = 10; // Prevent infinite loops
const MIN_TOOL_CALLS_FOR_ACCURACY = 2; // Encourage multiple searches for better results

export class OpenAIMCPClient {
  private mcp: Client;
  private openai: OpenAI;
  private transport:
    | StdioClientTransport
    | StreamableHTTPClientTransport
    | null = null;
  private tools: OpenAITool[] = [];
  private model: string;
  private userSystemInstruction: string | undefined;

  constructor(userSystemInstruction?: string) {
    this.mcp = new Client({ name: "openai-mcp-client", version: "1.0.0" });
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    this.model = DEFAULT_MODEL;
    this.userSystemInstruction = userSystemInstruction;
  }

  /** Check if path is a URL */
  private isUrl(path: string): boolean {
    return path.startsWith("http://") || path.startsWith("https://");
  }

  /** Check if path is a file path */
  private isFilePath(path: string): boolean {
    return (
      path.endsWith(".js") ||
      path.endsWith(".ts") ||
      path.endsWith(".py") ||
      path.includes("/") ||
      path.includes("\\")
    );
  }

  /** ------------------------------
   * Connect to MCP server
   * ------------------------------ */
  async connectToServer(serverPathOrUrl: string) {
    try {
      let transport: StdioClientTransport | StreamableHTTPClientTransport;

      if (this.isUrl(serverPathOrUrl)) {
        console.log(`Connecting to MCP server via URL: ${serverPathOrUrl}`);
        transport = new StreamableHTTPClientTransport(new URL(serverPathOrUrl));
      } else if (this.isFilePath(serverPathOrUrl)) {
        console.log(`Connecting to MCP server via file: ${serverPathOrUrl}`);

        const isPy = serverPathOrUrl.endsWith(".py");
        const isJs = serverPathOrUrl.endsWith(".js");
        const isTs = serverPathOrUrl.endsWith(".ts");

        if (!isPy && !isJs && !isTs) {
          throw new Error("Server script must be a .js, .py, or .ts file");
        }

        const command = isPy
          ? process.platform === "win32"
            ? "python"
            : "python3"
          : process.execPath;

        transport = new StdioClientTransport({
          command,
          args: [serverPathOrUrl],
        });
      } else {
        throw new Error(
          "Server must be either a URL (http://... or https://...) or a file path (.js, .py, or .ts)"
        );
      }

      this.transport = transport;
      await this.mcp.connect(transport);

      // Load tool definitions from MCP server
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description ?? "",
          parameters: tool.inputSchema as Record<string, unknown>,
        },
      }));

      console.log(
        "Connected to server with tools:",
        this.tools.map((t) => t.function?.name)
      );
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      throw error;
    }
  }

  /** ------------------------------
   * Build OpenAI messages from history
   * ------------------------------ */
  private buildMessages(
    query: string,
    history: Message[]
  ): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add custom system instruction if provided
    if (this.userSystemInstruction) {
      messages.push({ role: "system", content: this.userSystemInstruction });
    }

    // Rehydrate conversation history for OpenAI
    // We need to handle mcp-tool messages specially - they can't be added as 'tool' role
    // without a preceding assistant message with tool_calls
    for (const h of history) {
      if (h.role === "user") {
        messages.push({ role: "user", content: h.content });
      } else if (h.role === "assistant") {
        messages.push({ role: "assistant", content: h.content });
      } else if (h.role === "mcp-tool") {
        // Convert tool results to assistant message format for history
        // This avoids the tool_calls ordering requirement
        const toolResultStr =
          typeof h.toolResult === "string"
            ? h.toolResult
            : JSON.stringify(h.toolResult);

        // Include as context in an assistant message
        messages.push({
          role: "assistant",
          content: `[Previous search for "${h.toolName}": ${toolResultStr.slice(
            0,
            500
          )}${toolResultStr.length > 500 ? "..." : ""}]`,
        });
      }
    }

    // Add the new user query
    messages.push({ role: "user", content: query });

    return messages;
  }

  /** ------------------------------
   * Execute a single tool call via MCP
   * ------------------------------ */
  private async executeToolCall(
    toolCall: ToolCall
  ): Promise<{ id: string; content: string; toolMessage: Message }> {
    const { id, function: fn } = toolCall;
    const toolName = fn.name;

    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = fn.arguments ? JSON.parse(fn.arguments) : {};
    } catch {
      console.warn(`Failed to parse tool arguments for ${toolName}`);
    }

    const toolMessage: Message = {
      id,
      role: "mcp-tool",
      content: `Calling ${toolName}`,
      timestamp: new Date(),
      toolName,
      toolArgs: parsedArgs,
      toolStatus: "success",
    };

    try {
      const result = await this.mcp.callTool({
        name: toolName,
        arguments: parsedArgs,
      });

      console.log(`Tool ${toolName} result:`, result);
      toolMessage.toolResult = result.content;

      return {
        id,
        content:
          typeof result.content === "string"
            ? result.content
            : JSON.stringify(result.content),
        toolMessage,
      };
    } catch (error: any) {
      console.error(`Tool ${toolName} failed:`, error);
      const errorMessage = error?.message || "Tool execution error";
      toolMessage.toolStatus = "error";
      toolMessage.toolError = errorMessage;

      return {
        id,
        content: errorMessage,
        toolMessage,
      };
    }
  }

  /** ------------------------------
   * STREAMING with TOOL CALL LOOP
   * Loops until model stops requesting tools or max iterations reached
   * ------------------------------ */
  async *processWebQueryStream(
    query: string,
    history: Message[] = []
  ): AsyncGenerator<
    | { type: "content"; token: string }
    | { type: "final"; message: string; toolMessages: Message[] }
  > {
    const messages = this.buildMessages(query, history);
    const toolMessages: Message[] = [];
    let iteration = 0;

    // Tool call loop - continues until no more tool calls or max iterations
    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;
      // Accumulated tool calls from streaming
      const toolCallsAccum: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();
      let textOut = "";
      let hasToolCalls = false;

      // Create streaming request
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: this.tools.length > 0 ? this.tools : undefined,
        tool_choice: this.tools.length > 0 ? "auto" : undefined,
        stream: true,
        // temperature: 0,
      });

      // Process streaming chunks
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        // Stream text content to caller
        if (delta.content) {
          yield { type: "content", token: delta.content };
          textOut += delta.content;
        }

        // Accumulate tool calls (they come in chunks)
        if (delta.tool_calls?.length) {
          hasToolCalls = true;

          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0;

            if (!toolCallsAccum.has(index)) {
              toolCallsAccum.set(index, {
                id: tc.id ?? uuidv4(),
                name: "",
                arguments: "",
              });
            }

            const accum = toolCallsAccum.get(index)!;

            if (tc.id) {
              accum.id = tc.id;
            }
            if (tc.function?.name) {
              accum.name = tc.function.name;
            }
            if (tc.function?.arguments) {
              accum.arguments += tc.function.arguments;
            }
          }
        }
      }

      // If no tool calls, we're done - return final response
      if (!hasToolCalls) {
        console.log(`Completed after ${iteration} iteration(s)`);
        yield { type: "final", message: textOut, toolMessages };
        return;
      }

      console.log(
        `Iteration ${iteration}: Model requested ${toolCallsAccum.size} tool(s)`
      );

      // Convert accumulated tool calls to proper format
      const toolCalls: ToolCall[] = Array.from(toolCallsAccum.values()).map(
        (tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })
      );

      // Execute all tool calls in parallel
      const results = await Promise.all(
        toolCalls.map((tc) => this.executeToolCall(tc))
      );

      // Collect tool messages
      for (const result of results) {
        toolMessages.push(result.toolMessage);
      }

      // Add assistant message with tool calls to conversation
      messages.push({
        role: "assistant",
        content: textOut || null,
        tool_calls: toolCalls,
      });

      // Add tool results to conversation
      for (const result of results) {
        messages.push({
          role: "tool",
          tool_call_id: result.id,
          content: result.content,
        });
      }

      // Encourage more searches if we haven't made enough for accuracy
      // Add as user message to maintain valid message structure
      if (toolMessages.length < MIN_TOOL_CALLS_FOR_ACCURACY) {
        messages.push({
          role: "user",
          content:
            "[System reminder: These results may be incomplete. Search again with different keywords or synonyms before answering.]",
        });
      }

      // Loop continues - model will process tool results
    }

    // Max iterations reached - return what we have
    console.warn(
      `Max iterations (${MAX_TOOL_ITERATIONS}) reached, returning partial response`
    );
    yield {
      type: "final",
      message:
        "I need more information but reached my limit. Please try rephrasing your question.",
      toolMessages,
    };
  }

  /** ------------------------------
   * NON-STREAMING with TOOL CALL LOOP
   * Loops until model stops requesting tools or max iterations reached
   * ------------------------------ */
  async processQuery(
    query: string,
    history: Message[] = []
  ): Promise<{ response: string; toolMessages: Message[] }> {
    const messages = this.buildMessages(query, history);
    const toolMessages: Message[] = [];
    let iteration = 0;

    // Tool call loop - continues until no more tool calls or max iterations
    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: this.tools.length > 0 ? this.tools : undefined,
        tool_choice: this.tools.length > 0 ? "auto" : undefined,
        // temperature: 0,
      });

      const assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) {
        throw new Error("No response from OpenAI");
      }

      const textContent = assistantMessage.content || "";
      const rawToolCalls = assistantMessage.tool_calls;

      // If no tool calls, return the final response
      if (!rawToolCalls || rawToolCalls.length === 0) {
        console.log(`Completed after ${iteration} iteration(s)`);
        return { response: textContent, toolMessages };
      }

      console.log(
        `Iteration ${iteration}: Model requested ${rawToolCalls.length} tool(s)`
      );

      // Convert to our ToolCall type (filter to function type only)
      const toolCalls: ToolCall[] = rawToolCalls
        .filter(
          (
            tc
          ): tc is typeof tc & {
            type: "function";
            function: { name: string; arguments: string };
          } => tc.type === "function" && "function" in tc
        )
        .map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));

      // Execute all tool calls in parallel
      const results = await Promise.all(
        toolCalls.map((tc) => this.executeToolCall(tc))
      );

      // Collect tool messages
      for (const result of results) {
        toolMessages.push(result.toolMessage);
      }

      // Add assistant message with tool calls to conversation
      messages.push({
        role: "assistant",
        content: textContent || null,
        tool_calls: toolCalls,
      });

      // Add tool results to conversation
      for (const result of results) {
        messages.push({
          role: "tool",
          tool_call_id: result.id,
          content: result.content,
        });
      }

      // Encourage more searches if we haven't made enough for accuracy
      // Add as user message to maintain valid message structure
      if (toolMessages.length < MIN_TOOL_CALLS_FOR_ACCURACY) {
        messages.push({
          role: "user",
          content:
            "[System reminder: These results may be incomplete. Search again with different keywords or synonyms before answering.]",
        });
      }

      // Loop continues - model will process tool results
    }

    // Max iterations reached - return what we have
    console.warn(
      `Max iterations (${MAX_TOOL_ITERATIONS}) reached, returning partial response`
    );
    return {
      response:
        "I need more information but reached my limit. Please try rephrasing your question.",
      toolMessages,
    };
  }

  /** ------------------------------
   * Web query wrapper (for API route)
   * ------------------------------ */
  async processWebQuery(
    query: string,
    history: Message[] = []
  ): Promise<{ response: string; toolMessages: Message[] }> {
    let out = "";
    let tools: Message[] = [];

    try {
      for await (const event of this.processWebQueryStream(query, history)) {
        if (event.type === "content") {
          out += event.token;
        }
        if (event.type === "final") {
          out = event.message;
          tools = event.toolMessages;
        }
      }
    } catch (error) {
      console.error("Error processing web query:", error);
      return {
        response: `Sorry, I encountered an error while processing your request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        toolMessages: [],
      };
    }

    return { response: out, toolMessages: tools };
  }

  /** ------------------------------
   * Cleanup resources
   * ------------------------------ */
  async cleanup() {
    if (this.transport) {
      await this.transport.close();
    }
    await this.mcp.close();
  }
}
