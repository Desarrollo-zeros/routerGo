export interface CreateQuoteInput {
  userId: string;
  walletId: string;
  modelId: string;
  idempotencyKey: string;
  maxOutputTokens?: number;
}

export interface CreateQuoteOutput {
  quoteId: string;
  creditPrice: string;
  expiresAt: string;
  reused: boolean;
}

export interface CreateQuotePort {
  execute(input: CreateQuoteInput): Promise<CreateQuoteOutput>;
}
