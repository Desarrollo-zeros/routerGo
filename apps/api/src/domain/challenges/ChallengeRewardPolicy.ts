import { Credits } from '../value-objects/Credits.js';

export type ChallengeRewardDecision =
  | { eligible: true; credits: Credits; reason: 'ELIGIBLE' }
  | { eligible: false; credits: Credits; reason: 'INVALID_REQUEST' | 'DAILY_CAP_REACHED' | 'CHALLENGE_CAP_EXCEEDED' | 'BUDGET_DENIED' | 'ECONOMIC_CIRCUIT_OPEN' };

export type ChallengeRewardInput = {
  requested: Credits;
  challengeCap: Credits;
  todayEarned: Credits;
  dailyCap: Credits;
  budget: { allowed: boolean; reason?: 'BUDGET_DENIED' | 'ECONOMIC_CIRCUIT_OPEN' };
};

export function evaluateChallengeReward(input: ChallengeRewardInput): ChallengeRewardDecision {
  if (input.requested.isNegative() || input.challengeCap.isNegative() || input.todayEarned.isNegative()) return denied('INVALID_REQUEST');
  if (input.requested.gt(input.challengeCap)) return denied('CHALLENGE_CAP_EXCEEDED');
  const dailyRemaining = input.dailyCap.value - input.todayEarned.value;
  if (dailyRemaining <= 0n) return denied('DAILY_CAP_REACHED');
  if (!input.budget.allowed) return denied(input.budget.reason ?? 'BUDGET_DENIED');
  const reward = input.requested.value < dailyRemaining ? input.requested.value : dailyRemaining;
  return reward > 0n ? { eligible: true, credits: Credits.fromBigInt(reward), reason: 'ELIGIBLE' } : denied('DAILY_CAP_REACHED');
}

function denied(reason: Exclude<ChallengeRewardDecision, { eligible: true }>['reason']): ChallengeRewardDecision {
  return { eligible: false, credits: Credits.zero(), reason };
}
