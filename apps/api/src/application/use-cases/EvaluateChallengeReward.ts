import { Credits } from '../../domain/value-objects/Credits.js';
import { evaluateChallengeReward, type ChallengeRewardDecision } from '../../domain/challenges/ChallengeRewardPolicy.js';
import type { ChallengeRewardBudgetPort } from '../ports/outbound/ChallengeRewardBudget.js';

export type EvaluateChallengeRewardInput = {
  requestedCredits: bigint;
  challengeCapCredits: bigint;
  todayEarnedCredits: bigint;
  dailyCapCredits: bigint;
};

export class EvaluateChallengeReward {
  constructor(private readonly budget: ChallengeRewardBudgetPort) {}

  async execute(input: EvaluateChallengeRewardInput): Promise<ChallengeRewardDecision> {
    const requested = Credits.fromBigInt(input.requestedCredits);
    const budget = await this.budget.evaluate(requested);
    return evaluateChallengeReward({
      requested, challengeCap: Credits.fromBigInt(input.challengeCapCredits),
      todayEarned: Credits.fromBigInt(input.todayEarnedCredits), dailyCap: Credits.fromBigInt(input.dailyCapCredits), budget,
    });
  }
}
