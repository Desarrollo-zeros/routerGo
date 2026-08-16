import { describe, expect, it } from 'vitest';
import { Credits } from '../value-objects/Credits.js';
import { evaluateChallengeReward } from './ChallengeRewardPolicy.js';

const base = () => ({ requested: Credits.of(5n), challengeCap: Credits.of(10n), todayEarned: Credits.of(2n), dailyCap: Credits.of(10n), budget: { allowed: true } });

describe('evaluateChallengeReward', () => {
  it('allows only the amount inside challenge, daily, and budget policy', () => expect(evaluateChallengeReward(base())).toMatchObject({ eligible: true, credits: Credits.of(5n) }));
  it('caps at the remaining daily allowance', () => expect(evaluateChallengeReward({ ...base(), todayEarned: Credits.of(8n) })).toMatchObject({ eligible: true, credits: Credits.of(2n) }));
  it.each([
    ['CHALLENGE_CAP_EXCEEDED', { requested: Credits.of(11n) }],
    ['DAILY_CAP_REACHED', { todayEarned: Credits.of(10n) }],
    ['BUDGET_DENIED', { budget: { allowed: false as const, reason: 'BUDGET_DENIED' as const } }],
  ] as const)('denies with %s', (reason, override) => expect(evaluateChallengeReward({ ...base(), ...override })).toMatchObject({ eligible: false, reason }));
});
