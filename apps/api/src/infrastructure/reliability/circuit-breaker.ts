import type { Clock } from '../../application/ports/outbound/Clock.js';
import { CircuitOpenError } from './errors.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerConfig { failureThreshold: number; openDurationMs: number; clock: Clock }

export class CircuitBreaker {
  private currentState: CircuitState = 'CLOSED';
  private failures = 0;
  private openedAt = 0;
  private probeInFlight = false;

  constructor(private readonly config: CircuitBreakerConfig) {
    if (!Number.isInteger(config.failureThreshold) || config.failureThreshold < 1) throw new Error('Invalid failure threshold');
    if (config.openDurationMs < 0) throw new Error('Invalid open duration');
  }

  get state(): CircuitState { return this.currentState; }

  allowRequest(): boolean {
    if (this.currentState === 'CLOSED') return true;
    if (this.currentState === 'OPEN') {
      const elapsed = this.config.clock.now().getTime() - this.openedAt;
      if (elapsed < this.config.openDurationMs) return false;
      this.currentState = 'HALF_OPEN';
    }
    if (this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  assertAllowed(): void {
    if (!this.allowRequest()) throw new CircuitOpenError();
  }

  recordSuccess(): void {
    this.currentState = 'CLOSED';
    this.failures = 0;
    this.probeInFlight = false;
  }

  recordFailure(countsTowardsCircuit: boolean): boolean {
    if (!countsTowardsCircuit) {
      if (this.currentState === 'HALF_OPEN') this.recordSuccess();
      return false;
    }
    if (this.currentState === 'HALF_OPEN') return this.open();
    if (this.currentState !== 'CLOSED') return false;
    this.failures += 1;
    return this.failures >= this.config.failureThreshold ? this.open() : false;
  }

  private open(): boolean {
    const transitioned = this.currentState !== 'OPEN';
    this.currentState = 'OPEN';
    this.openedAt = this.config.clock.now().getTime();
    this.probeInFlight = false;
    return transitioned;
  }
}
