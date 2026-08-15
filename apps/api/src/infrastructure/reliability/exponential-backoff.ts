import type { BackoffStrategy } from '../../application/ports/outbound/reliability.js';

export interface BackoffConfig { baseDelayMs: number; maxDelayMs: number; jitterRatio: number }

export class ExponentialBackoff implements BackoffStrategy {
  constructor(private readonly config: BackoffConfig, private readonly random: () => number = Math.random) {
    if (config.baseDelayMs <= 0 || config.maxDelayMs < config.baseDelayMs) throw new Error('Invalid backoff bounds');
    if (config.jitterRatio < 0 || config.jitterRatio > 1) throw new Error('Invalid jitter ratio');
  }

  delayMs(attempt: number, retryAfterMs = 0): number {
    if (!Number.isInteger(attempt) || attempt < 1) throw new Error('Attempt must be a positive integer');
    const exponential = Math.min(this.config.maxDelayMs, this.config.baseDelayMs * (2 ** (attempt - 1)));
    const spread = exponential * this.config.jitterRatio;
    const jittered = exponential + ((this.random() * 2) - 1) * spread;
    return Math.min(this.config.maxDelayMs, Math.max(0, jittered, retryAfterMs));
  }
}
