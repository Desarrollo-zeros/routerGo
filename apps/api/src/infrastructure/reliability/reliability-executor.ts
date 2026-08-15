import type { Clock } from '../../application/ports/outbound/Clock.js';
import type { ClassifiedFailure, ErrorClassifier, FailureKind, ReliabilityObserver, RetryableOperation, Sleeper, IdempotencyMetadata } from '../../application/ports/outbound/reliability.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { RetryPolicy } from './retry-policy.js';
import { TimeoutPolicy } from './timeout-policy.js';

export interface ReliabilityExecutorDependencies {
  classifier: ErrorClassifier;
  retry: RetryPolicy;
  timeout?: TimeoutPolicy;
  sleeper: Sleeper;
  clock: Clock;
  observer?: ReliabilityObserver;
}

export interface ExecuteOptions { timeoutMs: number; idempotency: IdempotencyMetadata; signal?: AbortSignal; breaker?: CircuitBreaker }

class ExecutionContext {
  private committed = false;
  constructor(private currentAttempt: number, readonly idempotency: IdempotencyMetadata) {}
  get attempt(): number { return this.currentAttempt; }
  setAttempt(attempt: number): void { this.currentAttempt = attempt; }
  isCommitted(): boolean { return this.committed; }
  markCommitted(): void { this.committed = true; }
}

export class ReliabilityExecutor {
  private readonly timeout: TimeoutPolicy;
  constructor(private readonly dependencies: ReliabilityExecutorDependencies) {
    this.timeout = dependencies.timeout ?? new TimeoutPolicy();
  }

  async execute<T>(operation: RetryableOperation<T>, options: ExecuteOptions): Promise<T> {
    this.validate(options);
    options.breaker?.assertAllowed();
    const context = new ExecutionContext(1, options.idempotency);
    for (let attempt = 1; attempt <= this.dependencies.retry.maxAttempts; attempt += 1) {
      context.setAttempt(attempt);
      try {
        return await this.runAttempt(operation, options, context);
      } catch (error) {
        const decision = this.handleFailure(error, options, context);
        if (!decision.retry) throw error;
        await this.dependencies.sleeper.sleep(decision.delayMs, options.signal);
      }
    }
    throw new Error('Retry policy exhausted without an error');
  }

  private async runAttempt<T>(operation: RetryableOperation<T>, options: ExecuteOptions, context: ExecutionContext): Promise<T> {
    const attempt = context.attempt;
    this.dependencies.observer?.onAttempt?.({ attempt });
    const started = this.dependencies.clock.now().getTime();
    const result = await this.timeout.run((signal) => operation(signal, context), options.timeoutMs, options.signal);
    options.breaker?.recordSuccess();
    this.dependencies.observer?.onSuccess?.({ attempt, durationMs: this.durationSince(started) });
    return result;
  }

  private handleFailure(error: unknown, options: ExecuteOptions, context: ExecutionContext): { retry: boolean; delayMs: number } {
    const attempt = context.attempt;
    const failure = this.dependencies.classifier.classify(error);
    this.observeFailure(failure.kind, attempt);
    this.recordBreaker(options.breaker, failure.countsTowardsCircuit, attempt);
    return this.retryDecision(failure, context, attempt);
  }

  private observeFailure(kind: FailureKind, attempt: number): void {
    this.dependencies.observer?.onFailure?.({ attempt, kind });
    if (kind === 'TIMEOUT') this.dependencies.observer?.onTimeout?.({ attempt });
  }

  private recordBreaker(breaker: CircuitBreaker | undefined, counts: boolean, attempt: number): void {
    if (breaker?.recordFailure(counts)) this.dependencies.observer?.onCircuitOpen?.({ attempt });
  }

  private retryDecision(failure: ClassifiedFailure, context: ExecutionContext, attempt: number): { retry: boolean; delayMs: number } {
    if (!this.dependencies.retry.shouldRetry(failure, context)) return { retry: false, delayMs: 0 };
    const delayMs = this.dependencies.retry.delayMs(failure, attempt);
    this.dependencies.observer?.onRetry?.({ attempt, delayMs, kind: failure.kind });
    return { retry: true, delayMs };
  }

  private validate(options: ExecuteOptions): void {
    if (options.idempotency.mode === 'KEYED' && !options.idempotency.key) throw new Error('KEYED idempotency requires an idempotency key');
  }

  private durationSince(started: number): number {
    return Math.max(0, this.dependencies.clock.now().getTime() - started);
  }
}
