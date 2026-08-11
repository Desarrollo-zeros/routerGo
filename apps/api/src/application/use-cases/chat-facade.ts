export interface QuoteInput {
  userId: string;
  logicalModelId: string;
  maxOutputTokens: number;
  idempotencyKey: string;
}

export interface QuoteResult {
  quoteId: string;
  creditCost: bigint;
  maxOutputTokens: number;
  expiresAt: Date;
}

export interface RunInput {
  userId: string;
  quoteId: string;
  idempotencyKey: string;
}

export interface RunResult {
  runId: string;
  status: string;
  chargedCredits: bigint;
}

export interface ChatFacadePorts {
  createQuote(input: QuoteInput): Promise<QuoteResult>;
  createRun(input: RunInput): Promise<RunResult>;
  publishRun(runId: string): Promise<void>;
  getRun(runId: string): Promise<RunResult | null>;
}

export class ChatFacade {
  constructor(private readonly ports: ChatFacadePorts) {}

  async quote(input: QuoteInput): Promise<QuoteResult> {
    return this.ports.createQuote(input);
  }

  async run(input: RunInput): Promise<RunResult> {
    const result = await this.ports.createRun(input);
    await this.ports.publishRun(result.runId);
    return result;
  }

  async getRunStatus(runId: string): Promise<RunResult | null> {
    return this.ports.getRun(runId);
  }
}
