import { describe, expect, it } from 'vitest';
import { evaluateBetaRelease } from './BetaReleaseGate.js';

const ready = { requiredFlagsEnabled: true, economyCircuitClosed: true, rollbackVerified: true, regressionSuitePassed: true };

describe('evaluateBetaRelease', () => {
  it('allows only a fully verified local release gate', () => {
    expect(evaluateBetaRelease(ready)).toEqual({ ready: true, reason: 'READY' });
  });

  it('fails closed on the first unsafe condition', () => {
    expect(evaluateBetaRelease({ ...ready, economyCircuitClosed: false })).toEqual({ ready: false, reason: 'ECONOMY_CIRCUIT_OPEN' });
    expect(evaluateBetaRelease({ ...ready, rollbackVerified: false })).toEqual({ ready: false, reason: 'ROLLBACK_NOT_VERIFIED' });
  });
});
