import type { ClassifiedFailure, ErrorClassifier } from '../../application/ports/outbound/reliability.js';
import { CancellationError, TimeoutError } from './errors.js';

type ErrorRecord = Record<string, unknown>;
const transientCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH']);

function recordOf(error: unknown): ErrorRecord {
  return typeof error === 'object' && error !== null ? error as ErrorRecord : {};
}

function normalizedRetryAfter(error: ErrorRecord): number | undefined {
  return typeof error.retryAfterMs === 'number' && error.retryAfterMs >= 0 ? error.retryAfterMs : undefined;
}

export class DefaultErrorClassifier implements ErrorClassifier {
  classify(error: unknown): ClassifiedFailure {
    if (error instanceof TimeoutError) return this.failure({ kind: 'TIMEOUT', retryable: true, countsTowardsCircuit: true, cause: error });
    if (error instanceof CancellationError || (error instanceof Error && error.name === 'AbortError')) {
      return this.failure({ kind: 'CANCELLED', retryable: false, countsTowardsCircuit: false, cause: error });
    }
    return this.classifyRecord(error, recordOf(error));
  }

  private classifyRecord(cause: unknown, value: ErrorRecord): ClassifiedFailure {
    const status = typeof value.status === 'number' ? value.status : value.statusCode;
    if (status === 429) return this.failure({ kind: 'RATE_LIMITED', retryable: true, countsTowardsCircuit: true, cause, retryAfterMs: normalizedRetryAfter(value) });
    if (status === 408 || value.code === 'ETIMEDOUT') return this.failure({ kind: 'TIMEOUT', retryable: true, countsTowardsCircuit: true, cause });
    if (typeof status === 'number' && status >= 500) return this.failure({ kind: 'UNAVAILABLE', retryable: true, countsTowardsCircuit: true, cause });
    if (this.isTransientCode(value.code)) return this.failure({ kind: 'TRANSIENT', retryable: true, countsTowardsCircuit: true, cause });
    if (typeof status === 'number' && status >= 400) return this.failure({ kind: 'PERMANENT', retryable: false, countsTowardsCircuit: false, cause });
    return this.failure({ kind: 'UNKNOWN', retryable: false, countsTowardsCircuit: false, cause });
  }

  private isTransientCode(code: unknown): boolean {
    return typeof code === 'string' && transientCodes.has(code);
  }

  private failure(input: {
    kind: ClassifiedFailure['kind'];
    retryable: boolean;
    countsTowardsCircuit: boolean;
    cause: unknown;
    retryAfterMs?: number;
  }): ClassifiedFailure {
    return input;
  }
}
