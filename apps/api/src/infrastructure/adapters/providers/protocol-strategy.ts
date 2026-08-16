export type Protocol = 'responses' | 'messages' | 'chat_completions';

export interface ProviderChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderRequest {
  model: string;
  messages: ProviderChatMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  userId?: string;
}

export interface ProviderResponse {
  id: string;
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
  raw: unknown;
  requestId?: string;
}

export interface ProviderStreamChunk {
  delta: string;
  done: boolean;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ProtocolStrategy {
  readonly protocol: Protocol;
  buildRequest(req: ProviderRequest): { urlPath: string; body: Record<string, unknown> };
  parseResponse(raw: unknown): ProviderResponse;
  parseChunk(raw: unknown): ProviderStreamChunk;
}
