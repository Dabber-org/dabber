export interface Message {
  id: string
  role: 'user' | 'assistant' | 'mcp-tool'
  content: string
  timestamp: Date
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
  toolStatus?: 'success' | 'error'
  toolError?: string
}

export interface ChatRequest {
  message: string
  messages: Message[]
}

export interface MCPActivity {
  id: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  result: unknown;
  timestamp: Date;
  status: 'success' | 'error';
  error?: string;
}

export interface ChatResponse {
  message: string;
  toolMessages?: Message[];
}
