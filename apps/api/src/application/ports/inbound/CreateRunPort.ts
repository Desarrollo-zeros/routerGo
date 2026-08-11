export interface CreateRunInput {
  userId: string;
  quoteId: string;
  idempotencyKey: string;
}

export interface CreateRunOutput {
  runId: string;
  status: string;
  reused: boolean;
}

export interface CreateRunPort {
  execute(input: CreateRunInput): Promise<CreateRunOutput>;
}
