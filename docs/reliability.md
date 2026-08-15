# Reliability foundation

RouterGo keeps external-operation reliability in application ports and infrastructure primitives. The domain does not depend on HTTP, SDKs, `fetch`, or provider-specific errors.

## Error taxonomy

`DefaultErrorClassifier` normalizes adapter failures into `TRANSIENT`, `RATE_LIMITED`, `TIMEOUT`, `UNAVAILABLE`, `PERMANENT`, `CANCELLED`, or `UNKNOWN`. Adapters should expose normalized metadata such as `status`, `code`, and `retryAfterMs`; HTTP header parsing stays outside the domain.

## Timeout and cancellation

`TimeoutPolicy` receives a timeout per operation and an optional caller `AbortSignal`. It aborts the operation, returns a distinct `TimeoutError`, and removes its timer and abort listener in cleanup. Caller cancellation returns `CancellationError` and is not retryable.

## Bounded retry, backoff, and Retry-After

`RetryPolicy.maxAttempts` means total attempts, including the first call. `ExponentialBackoff` calculates a capped exponential delay and applies injected jitter. A normalized `retryAfterMs` may extend the delay, but never beyond `maxDelayMs`.

```ts
const retry = new RetryPolicy(
  { maxAttempts: 3 },
  new ExponentialBackoff({ baseDelayMs: 50, maxDelayMs: 1_000, jitterRatio: 0.2 }),
);
```

`ReliabilityExecutor` delegates classification, delay calculation, sleeping, and telemetry. It never loops indefinitely and does not retry permanent, cancelled, unsafe, or already-committed operations.

## Idempotency and streaming commitment

Each execution declares `SAFE`, `KEYED`, or `UNSAFE` idempotency. `KEYED` requires an idempotency key. An operation can call `context.markCommitted()` after its first visible stream chunk; subsequent failures cannot trigger an automatic retry, preserving RouterGo's no-silent-restart rule.

## Circuit breaker

`CircuitBreaker` is an in-process primitive with `CLOSED`, `OPEN`, and `HALF_OPEN` states. The caller supplies a `Clock`, failure threshold, and cooldown. Only failures classified with `countsTowardsCircuit` affect the breaker. `OPEN` rejects new executions quickly; one cooldown probe may transition to `CLOSED` on success or back to `OPEN` on failure.

## Telemetry hooks

`ReliabilityObserver` provides vendor-neutral hooks for attempts, retries and delay, successes and duration, failures, timeouts, and circuit openings. Future adapters can map these events to metrics such as `external_attempt_total`, `external_retry_total`, `external_timeout_total`, `external_rate_limited_total`, `circuit_open_total`, `external_duration`, and `retry_delay` without putting logging or vendor code in the policies.
