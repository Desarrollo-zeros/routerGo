import { describe, expect, it } from 'vitest';
import { ChallengeVerificationRegistry } from './ChallengeVerificationRegistry.js';

const input = { challengeId: 'challenge-1', challengeVersion: 1, evidence: { answer: 'ok' } };
const strategy = (key: string) => ({ key, verify: async () => ({ verified: true as const, reason: 'VERIFIED' as const }) });

describe('ChallengeVerificationRegistry', () => {
  it('resolves only explicitly registered strategies', async () => {
    const registry = new ChallengeVerificationRegistry();
    registry.register(strategy('typed.quiz'));
    await expect(registry.verify('typed.quiz', input)).resolves.toEqual({ verified: true, reason: 'VERIFIED' });
    await expect(registry.verify('remote.import', input)).resolves.toEqual({ verified: false, reason: 'VERIFICATION_FAILED' });
  });

  it('rejects duplicate and unsafe registry keys', () => {
    const registry = new ChallengeVerificationRegistry();
    registry.register(strategy('typed.quiz'));
    expect(() => registry.register(strategy('typed.quiz'))).toThrow('DUPLICATE_VERIFICATION_STRATEGY');
    expect(() => registry.register(strategy('eval()'))).toThrow('INVALID_VERIFICATION_STRATEGY_KEY');
  });
});
