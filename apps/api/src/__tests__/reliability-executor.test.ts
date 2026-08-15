import { describe, expect, it } from 'vitest';
import { ExponentialBackoff } from '../infrastructure/reliability/exponential-backoff.js';
import { DefaultErrorClassifier } from '../infrastructure/reliability/error-classifier.js';
import { ReliabilityExecutor } from '../infrastructure/reliability/reliability-executor.js';
import { RetryPolicy } from '../infrastructure/reliability/retry-policy.js';
import { TimeoutPolicy } from '../infrastructure/reliability/timeout-policy.js';
import { SystemClock } from '../application/ports/outbound/Clock.js';
import { FakeTimer, RecordingSleeper, fixedRandom } from './helpers/reliability-fakes.js';

function createExecutor(maxAttempts = 3, maxDelayMs = 1000) {
  const retry = new RetryPolicy(
    { maxAttempts },
    new ExponentialBackoff({ baseDelayMs: 10, maxDelayMs, jitterRatio: 0 }, fixedRandom()),
  );
  const sleeper = new RecordingSleeper();
  const events: string[] = [];
  const executor = new ReliabilityExecutor({
    classifier: new DefaultErrorClassifier(), retry, sleeper, clock: new SystemClock(),
    observer: { onAttempt: () => events.push('attempt'), onRetry: () => events.push('retry'), onFailure: () => events.push('failure'), onSuccess: () => events.push('success') },
  });
  return { executor, sleeper, events };
}

const safe = { mode: 'SAFE' as const };

describe('reliability executor', () => {
  it('retries transient failures with bounded exponential delay, then succeeds', async () => {
    const { executor, sleeper, events } = createExecutor();
    let attempts = 0;
    const result = await executor.execute(async () => {
      attempts += 1;
      if (attempts < 3) throw { code: 'ECONNRESET' };
      return 'ok';
    }, { timeoutMs: 100, idempotency: safe });
    expect(result).toBe('ok');
    expect(sleeper.delays).toEqual([10, 20]);
    expect(events).toEqual(['attempt', 'failure', 'retry', 'attempt', 'failure', 'retry', 'attempt', 'success']);
  });

  it('does not retry permanent or unsafe failures', async () => {
    const permanent = createExecutor();
    await expect(permanent.executor.execute(async () => { throw { status: 400 }; }, { timeoutMs: 100, idempotency: safe })).rejects.toMatchObject({ status: 400 });
    expect(permanent.sleeper.delays).toEqual([]);
    const unsafe = createExecutor();
    await expect(unsafe.executor.execute(async () => { throw { status: 503 }; }, { timeoutMs: 100, idempotency: { mode: 'UNSAFE' } })).rejects.toMatchObject({ status: 503 });
    expect(unsafe.sleeper.delays).toEqual([]);
  });

  it('honors normalized Retry-After but caps the delay', async () => {
    const { executor, sleeper } = createExecutor(2, 50);
    await expect(executor.execute(async () => { throw { status: 429, retryAfterMs: 500 }; }, { timeoutMs: 100, idempotency: safe })).rejects.toMatchObject({ status: 429 });
    expect(sleeper.delays).toEqual([50]);
  });

  it('stops after total maxAttempts without an unbounded loop', async () => {
    const { executor, sleeper } = createExecutor(2);
    await expect(executor.execute(async () => { throw { code: 'ECONNRESET' }; }, { timeoutMs: 100, idempotency: safe })).rejects.toMatchObject({ code: 'ECONNRESET' });
    expect(sleeper.delays).toEqual([10]);
  });

  it('never retries after a stream has committed its first visible chunk', async () => {
    const { executor, sleeper } = createExecutor();
    await expect(executor.execute(async (_signal, context) => {
      context.markCommitted();
      throw { status: 503 };
    }, { timeoutMs: 100, idempotency: safe })).rejects.toMatchObject({ status: 503 });
    expect(sleeper.delays).toEqual([]);
  });

  it('requires a key for KEYED idempotency', async () => {
    const { executor } = createExecutor();
    await expect(executor.execute(async () => 'ok', { timeoutMs: 100, idempotency: { mode: 'KEYED' } })).rejects.toThrow(/idempotency key/i);
  });

  it('emits timeout telemetry through the executor', async () => {
    const timer = new FakeTimer();
    const events: string[] = [];
    const executor = new ReliabilityExecutor({
      classifier: new DefaultErrorClassifier(),
      retry: new RetryPolicy({ maxAttempts: 1 }, new ExponentialBackoff({ baseDelayMs: 1, maxDelayMs: 1, jitterRatio: 0 })),
      timeout: new TimeoutPolicy(timer), sleeper: new RecordingSleeper(), clock: new SystemClock(),
      observer: { onTimeout: () => events.push('timeout'), onFailure: () => events.push('failure') },
    });
    const pending = executor.execute(async () => new Promise<never>(() => {}), { timeoutMs: 10, idempotency: safe });
    timer.fire();
    await expect(pending).rejects.toThrow(/exceeded/);
    expect(events).toEqual(['failure', 'timeout']);
  });
});
