import type { BudgetDecision } from '../../../domain/economy/budget/EconomyBudgetPolicy';

export interface BudgetEvaluatorPort {
  evaluate(input: {
    modelId: string;
    gatewayId: string;
    estimatedPlatformCostMicrousd: bigint;
    now: Date;
  }): Promise<BudgetDecision>;
}
