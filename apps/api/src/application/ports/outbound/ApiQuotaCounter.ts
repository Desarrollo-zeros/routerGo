import type { ApiQuotaPolicy } from './ApiQuotaRepository';

export interface ApiQuotaUsage {
  requests: number;
  tokens: number;
  credits: bigint;
}

export interface ApiQuotaCounter {
  consume(policies: ApiQuotaPolicy[], usage: ApiQuotaUsage): Promise<ApiQuotaDecision>;
}

export interface ApiQuotaDecision {
  allowed: boolean;
  reason: 'ALLOWED' | 'REQUESTS_EXCEEDED' | 'TOKENS_EXCEEDED' | 'CREDITS_EXCEEDED';
  retryAfterMs: number;
}
