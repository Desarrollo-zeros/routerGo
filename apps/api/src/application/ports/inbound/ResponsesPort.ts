export interface ResponsesInput {
  userId: string;
  walletId: string;
  model: string;
  input: string | Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  idempotencyKey: string;
  clientId?: string;
  apiKeyId?: string;
  maxOutputTokens?: number;
  stream?: boolean;
  onChunk?: (chunk: { delta: string; done: boolean }) => void;
}

export interface ResponsesOutput {
  id: string;
  object: 'response';
  status: 'completed';
  model: string;
  output: Array<{ type: 'message'; role: 'assistant'; content: Array<{ type: 'output_text'; text: string }> }>;
}

export interface ResponsesPort {
  execute(input: ResponsesInput): Promise<ResponsesOutput>;
}
