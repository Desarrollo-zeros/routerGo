import { describe, expect, it } from 'vitest';
import { ExponentialBackoff } from '../infrastructure/reliability/exponential-backoff.js';
import { DefaultErrorClassifier } from '../infrastructure/reliability/error-classifier.js';
import { CircuitBreaker } from '../infrastructure/reliability/circuit-breaker.js';
import { TimeoutPolicy } from '../infrastructure/reliability/timeout-policy.js';
import { CancellationError, CircuitOpenError, TimeoutError } from '../infrastructure/reliability/errors.js';
import { FakeTimer, fixedRandom } from './helpers/reliability-fakes.js';

describe('reliability primitives', () => {
  it('calculates capped exponential backoff with deterministic jitter', () => {
    const backoff = new ExponentialBackoff({ baseDelayMs: 100, maxDelayMs: 250, jitterRatio: 0.5 }, fixedRandom());
    expect(backoff.delayMs(1)).toBe(100);
    expect(backoff.delayMs(2)).toBe(200);
    expect(backoff.delayMs(3)).toBe(250);
    expect(backoff.delayMs(1, 500)).toBe(250);
  });

  it('classifies transient, rate-limited, timeout and permanent failures', () => {
    const classifier = new DefaultErrorClassifier();
    expect(classifier.classify({ code: 'ECONNRESET' }).kind).toBe('TRANSIENT');
    expect(classifier.classify({ status: 429, retryAfterMs: 120 }).retryAfterMs).toBe(120);
    expect(classifier.classify({ status: 408 }).kind).toBe('TIMEOUT');
    expect(classifier.classify({ status: 400 }).retryable).toBe(false);
  });

  it('transitions CLOSED → OPEN → HALF_OPEN → CLOSED', () => {
    let now = new Date('2026-01-01T00:00:00.000Z');
    const clock = { now: () => new Date(now) };
    const breaker = new CircuitBreaker({ failureThreshold: 2, openDurationMs: 1000, clock });
    expect(breaker.allowRequest()).toBe(true);
    breaker.recordFailure(true);
    breaker.recordFailure(true);
    expect(breaker.state).toBe('OPEN');
    expect(breaker.allowRequest()).toBe(false);
    now = new Date(now.getTime() + 1000);
    expect(breaker.allowRequest()).toBe(true);
    expect(breaker.state).toBe('HALF_OPEN');
    breaker.recordSuccess();
    expect(breaker.state).toBe('CLOSED');
  });

  it('fails fast while OPEN, reopens after a failed HALF_OPEN probe, and ignores non-counted failures', () => {
    let now = new Date('2026-01-01T00:00:00.000Z');
    const clock = { now: () => new Date(now) };
    const breaker = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 10, clock });
    breaker.recordFailure(false);
    expect(breaker.state).toBe('CLOSED');
    breaker.recordFailure(true);
    expect(breaker.state).toBe('OPEN');
    expect(() => breaker.assertAllowed()).toThrow(CircuitOpenError);
    now = new Date(now.getTime() + 10);
    expect(breaker.allowRequest()).toBe(true);
    breaker.recordFailure(true);
    expect(breaker.state).toBe('OPEN');
  });

  it('times out through an injected timer and exposes a timeout error', async () => {
    const timer = new FakeTimer();
    const timeout = new TimeoutPolicy(timer);
    const pending = timeout.run(() => new Promise<never>(() => {}), 50);
    timer.fire();
    await expect(pending).rejects.toBeInstanceOf(TimeoutError);
    expect(timer.cleared).toBe(true);
  });

  it('distinguishes caller cancellation from timeout', async () => {
    const timer = new FakeTimer();
    const controller = new AbortController();
    const pending = new TimeoutPolicy(timer).run(() => new Promise<never>(() => {}), 50, controller.signal);
    controller.abort('caller stopped');
    await expect(pending).rejects.toBeInstanceOf(CancellationError);
  });
});
