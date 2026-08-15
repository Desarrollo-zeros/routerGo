export type FailureKind = 'TRANSIENT' | 'RATE_LIMITED' | 'TIMEOUT' | 'UNAVAILABLE' | 'PERMANENT' | 'CANCELLED' | 'UNKNOWN';
export type IdempotencyMode = 'SAFE' | 'KEYED' | 'UNSAFE';

export interface IdempotencyMetadata { mode: IdempotencyMode; key?: string }

export interface ClassifiedFailure {
  kind: FailureKind;
  retryable: boolean;
  countsTowardsCircuit: boolean;
  retryAfterMs?: number;
  cause: unknown;
}

export interface ErrorClassifier { classify(error: unknown): ClassifiedFailure }
export interface BackoffStrategy { delayMs(attempt: number, retryAfterMs?: number): number }
export interface Sleeper { sleep(delayMs: number, signal?: AbortSignal): Promise<void> }
export interface TimerPort { set(callback: () => void, delayMs: number): unknown; clear(handle: unknown): void }

export interface RetryContext {
  readonly attempt: number;
  readonly idempotency: IdempotencyMetadata;
  isCommitted(): boolean;
  markCommitted(): void;
}

export interface RetryableOperation<T> {
  (signal: AbortSignal, context: RetryContext): Promise<T>;
}

export interface ReliabilityObserver {
  onAttempt?(event: { attempt: number }): void;
  onRetry?(event: { attempt: number; delayMs: number; kind: FailureKind }): void;
  onSuccess?(event: { attempt: number; durationMs: number }): void;
  onFailure?(event: { attempt: number; kind: FailureKind }): void;
  onTimeout?(event: { attempt: number }): void;
  onCircuitOpen?(event: { attempt: number }): void;
}
