import type { TimerPort } from '../../application/ports/outbound/reliability.js';
import { CancellationError, TimeoutError } from './errors.js';
import { SystemTimer } from './system-timer.js';

const NEVER = new Promise<never>(() => {});

class TimeoutExecution {
  private readonly controller = new AbortController();
  private timerHandle: unknown;
  private timeoutError: TimeoutError | undefined;
  private cancellationError: CancellationError | undefined;
  private abortHandler: (() => void) | undefined;

  constructor(
    private readonly timer: TimerPort,
    private readonly timeoutMs: number,
    private readonly parentSignal?: AbortSignal,
  ) {}

  async run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    try {
      return await Promise.race([operation(this.controller.signal), this.timeout(), this.cancellation()]);
    } catch (error) {
      throw this.preferredError(error);
    } finally {
      this.cleanup();
    }
  }

  private timeout(): Promise<never> {
    return new Promise((_, reject) => {
      this.timerHandle = this.timer.set(() => {
        this.timeoutError = new TimeoutError(`Operation exceeded ${this.timeoutMs}ms`);
        this.controller.abort(this.timeoutError);
        reject(this.timeoutError);
      }, this.timeoutMs);
    });
  }

  private cancellation(): Promise<never> {
    const signal = this.parentSignal;
    if (!signal) return NEVER;
    return new Promise((_, reject) => {
      this.abortHandler = () => {
        this.cancellationError = new CancellationError('Operation cancelled', signal.reason);
        this.controller.abort(signal.reason);
        reject(this.cancellationError);
      };
      signal.addEventListener('abort', this.abortHandler, { once: true });
    });
  }

  private preferredError(error: unknown): unknown {
    return this.timeoutError ?? this.cancellationError ?? error;
  }

  private cleanup(): void {
    if (this.timerHandle !== undefined) this.timer.clear(this.timerHandle);
    if (this.abortHandler) this.parentSignal?.removeEventListener('abort', this.abortHandler);
  }
}

export class TimeoutPolicy {
  constructor(private readonly timer: TimerPort = new SystemTimer()) {}

  async run<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parentSignal?: AbortSignal): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('timeoutMs must be positive');
    if (parentSignal?.aborted) throw new CancellationError('Operation cancelled', parentSignal.reason);
    return new TimeoutExecution(this.timer, timeoutMs, parentSignal).run(operation);
  }
}
