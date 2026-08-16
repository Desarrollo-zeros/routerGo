export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionsInput {
  userId: string;
  walletId: string;
  model: string;
  messages: ChatCompletionMessage[];
  idempotencyKey: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionsOutput {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{ index: number; message: ChatCompletionMessage; finish_reason: 'stop' }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface ChatCompletionsPort {
  execute(input: ChatCompletionsInput): Promise<ChatCompletionsOutput>;
}
