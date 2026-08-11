export interface RefundRunInput {
  runId: string;
  userId: string;
  reason: string;
  idempotencyKey: string;
}

export interface RefundRunOutput {
  refundId: string | null;
  refunded: boolean;
  reused: boolean;
}

export interface RefundRunPort {
  execute(input: RefundRunInput): Promise<RefundRunOutput>;
}
