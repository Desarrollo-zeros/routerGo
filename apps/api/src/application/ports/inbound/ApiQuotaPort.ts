export interface CheckApiQuotaInput {
  clientId: string;
  keyId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  credits: bigint;
}

export interface CheckApiQuotaOutput {
  allowed: boolean;
  reason: 'ALLOWED' | 'REQUESTS_EXCEEDED' | 'TOKENS_EXCEEDED' | 'CREDITS_EXCEEDED';
  retryAfterMs: number;
}

export interface ApiQuotaPort {
  check(input: CheckApiQuotaInput): Promise<CheckApiQuotaOutput>;
}
