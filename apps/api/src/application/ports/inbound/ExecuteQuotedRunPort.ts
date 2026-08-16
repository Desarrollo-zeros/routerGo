export interface ExecuteQuotedRunInput {
  userId: string;
  quoteId: string;
  idempotencyKey: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  stream?: boolean;
}

export interface ExecuteQuotedRunOutput {
  runId: string;
  status: string;
  economyStatus: string;
  content: string;
  actualUserCredits: bigint;
  providerRequestId: string | null;
  reused: boolean;
}

export interface ExecuteQuotedRunPort {
  execute(input: ExecuteQuotedRunInput): Promise<ExecuteQuotedRunOutput>;
}
