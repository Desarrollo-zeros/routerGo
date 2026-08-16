import type { Credits } from '../../../domain/value-objects/Credits.js';

export type ChallengeBudgetDecision =
  | { allowed: true; remainingCredits?: Credits }
  | { allowed: false; reason: 'BUDGET_DENIED' | 'ECONOMIC_CIRCUIT_OPEN' };

export interface ChallengeRewardBudgetPort {
  evaluate(requested: Credits): Promise<ChallengeBudgetDecision>;
}
