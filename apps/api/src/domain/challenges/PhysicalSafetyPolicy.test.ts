import { describe, expect, it } from 'vitest';
import { evaluatePhysicalSafety, type PhysicalSafetyConfig, type PhysicalSafetyInput } from './PhysicalSafetyPolicy.js';

const config: PhysicalSafetyConfig = { maxDurationMs: 60000, cooldownMs: 300000, maxSessionsPerDay: 3 };
const base = (): PhysicalSafetyInput => ({ physical: true, requestedDurationMs: 30000, sessionsToday: 1, nowMs: 1_000_000, stopRequested: false });

describe('evaluatePhysicalSafety', () => {
  it('allows a bounded physical session', () => expect(evaluatePhysicalSafety(base(), config)).toEqual({ allowed: true, reason: 'SAFE' }));
  it.each([
    ['STOP_REQUESTED', { stopRequested: true }],
    ['DURATION_CAP_EXCEEDED', { requestedDurationMs: 60001 }],
    ['DAILY_SESSION_CAP_REACHED', { sessionsToday: 3 }],
    ['COOLDOWN_ACTIVE', { lastCompletedAtMs: 900000 }],
  ] as const)('denies unsafe physical input with %s', (reason, override) => {
    expect(evaluatePhysicalSafety({ ...base(), ...override }, config)).toEqual({ allowed: false, reason });
  });
  it('allows a non-physical alternative without physical limits', () => expect(evaluatePhysicalSafety({ ...base(), physical: false, requestedDurationMs: 0 }, config)).toEqual({ allowed: true, reason: 'NON_PHYSICAL_ALTERNATIVE' }));
});
