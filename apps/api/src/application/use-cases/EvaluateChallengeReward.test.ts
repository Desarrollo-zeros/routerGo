import { describe, expect, it } from 'vitest';
import { EvaluateChallengeReward } from './EvaluateChallengeReward.js';
import { Credits } from '../../domain/value-objects/Credits.js';

describe('EvaluateChallengeReward', () => {
  it('consults the budget port before returning eligible GoCredits', async () => {
    const calls: bigint[] = [];
    const useCase = new EvaluateChallengeReward({
      evaluate: async (requested) => { calls.push(requested.value); return { allowed: true, remainingCredits: Credits.of(100n) }; },
    });
    await expect(useCase.execute({ requestedCredits: 5n, challengeCapCredits: 10n, todayEarnedCredits: 0n, dailyCapCredits: 20n })).resolves.toMatchObject({ eligible: true, credits: Credits.of(5n) });
    expect(calls).toEqual([5n]);
  });
});
