export const EXECUTE_QUOTED_RUN_ERROR_CODES = [
  'INVALID_INPUT', 'QUOTE_NOT_FOUND', 'QUOTE_EXPIRED', 'FORBIDDEN', 'BUDGET_DENIED',
  'RUN_ALREADY_EXECUTING', 'RUN_ALREADY_COMPLETED', 'PROVIDER_EXECUTION_FAILED',
  'USAGE_EXCEEDS_RESERVATION', 'SETTLEMENT_FAILED', 'RELEASE_FAILED', 'RECONCILIATION_REQUIRED',
] as const;
export type ExecuteQuotedRunErrorCode = typeof EXECUTE_QUOTED_RUN_ERROR_CODES[number];

export class ExecuteQuotedRunError extends Error {
  constructor(readonly code: ExecuteQuotedRunErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ExecuteQuotedRunError';
  }
}

export interface ProviderFailureOutcome {
  requestId?: string;
  deliveryStarted: boolean;
  billableUserCredits?: bigint;
  inputTokens?: number;
  outputTokens?: number;
  providerCostMicrousd?: bigint;
}

export class ProviderExecutionError extends Error {
  constructor(message: string, readonly outcome?: ProviderFailureOutcome, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProviderExecutionError';
  }
}
