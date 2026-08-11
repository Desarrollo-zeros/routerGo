export interface VerifyActivityInput {
  userId: string;
  walletId: string;
  sessionId: string;
  reps: number;
  idempotencyKey: string;
  challengeNonce?: string;
}

export interface VerifyActivityOutput {
  ledgerId: string;
  credits: string;
  newBalance: string;
  reused: boolean;
}

export interface VerifyActivityPort {
  execute(input: VerifyActivityInput): Promise<VerifyActivityOutput>;
}
