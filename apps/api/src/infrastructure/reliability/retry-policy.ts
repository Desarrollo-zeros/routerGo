import type { BackoffStrategy, ClassifiedFailure, RetryContext } from '../../application/ports/outbound/reliability.js';

export interface RetryConfig { maxAttempts: number }
type RetryablePredicate = (failure: ClassifiedFailure) => boolean;

export class RetryPolicy {
  readonly maxAttempts: number;

  constructor(config: RetryConfig, private readonly backoff: BackoffStrategy, private readonly retryable: RetryablePredicate = (failure) => failure.retryable) {
    if (!Number.isInteger(config.maxAttempts) || config.maxAttempts < 1) throw new Error('maxAttempts must be at least 1');
    this.maxAttempts = config.maxAttempts;
  }

  shouldRetry(failure: ClassifiedFailure, context: RetryContext): boolean {
    if (context.attempt >= this.maxAttempts || context.isCommitted()) return false;
    if (context.idempotency.mode === 'UNSAFE') return false;
    return this.retryable(failure);
  }

  delayMs(failure: ClassifiedFailure, attempt: number): number {
    return this.backoff.delayMs(attempt, failure.retryAfterMs);
  }
}
