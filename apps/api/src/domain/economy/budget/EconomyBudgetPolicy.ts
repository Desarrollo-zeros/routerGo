import {
  HasEligibleFunding,
  HasRemainingBudget,
  IsBudgetActive,
  IsEconomicCircuitClosed,
  MatchesBudgetScope,
} from './budget-specifications.js';
import type {
  BudgetScope,
  BudgetSnapshot,
  BudgetUnit,
  BudgetUsage,
  EconomicAmount,
  EconomicCircuit,
  RevenueFunding,
} from './budget-types.js';

export {
  EconomicAmount,
  createBudgetSnapshot,
  createBudgetUsage,
  createRevenueFunding,
  createScope,
} from './budget-types.js';
export type { BudgetScope, BudgetSnapshot, BudgetUsage, EconomicCircuit, RevenueFunding } from './budget-types.js';

export const BUDGET_DECISION_REASONS = [
  'ALLOWED',
  'NO_APPLICABLE_BUDGET',
  'OUTSIDE_BUDGET_PERIOD',
  'SCOPE_MISMATCH',
  'BUDGET_EXHAUSTED',
  'REQUEST_EXCEEDS_REMAINING',
  'ECONOMIC_CIRCUIT_OPEN',
  'SPENDING_DISABLED',
  'INVALID_UNIT',
  'INVALID_REQUEST',
  'INSUFFICIENT_FINALIZED_REVENUE',
] as const;
export type BudgetDecisionReason = typeof BUDGET_DECISION_REASONS[number];

export interface BudgetDecision {
  readonly allowed: boolean;
  readonly reason: BudgetDecisionReason;
  readonly requestedAmount: bigint;
  readonly remainingAmount?: bigint;
  readonly budgetId?: string;
}

export interface BudgetEvaluationInput {
  readonly budget: BudgetSnapshot | null;
  readonly scope: BudgetScope;
  readonly requested: EconomicAmount;
  readonly usage: BudgetUsage;
  readonly now: Date;
  readonly circuit: EconomicCircuit;
  readonly funding?: RevenueFunding;
}

interface BudgetEvaluationWithBudget extends Omit<BudgetEvaluationInput, 'budget'> {
  readonly budget: BudgetSnapshot;
}

export class EconomyBudgetPolicy {
  evaluate(input: BudgetEvaluationInput): BudgetDecision {
    const requestedAmount = input.requested.amount;
    const circuitReason = circuitDenial(input.circuit);
    if (circuitReason) return decision(circuitReason, requestedAmount);
    if (requestedAmount <= 0n) return decision('INVALID_REQUEST', requestedAmount);
    const budget = input.budget;
    if (!budget) return decision('NO_APPLICABLE_BUDGET', requestedAmount);
    return this.evaluateBudget({ ...input, budget });
  }

  private evaluateBudget(input: BudgetEvaluationWithBudget): BudgetDecision {
    const requestedAmount = input.requested.amount;
    const { budget } = input;
    if (!sameUnit(budget.limit.unit, input.requested.unit, input.usage)) {
      return decision('INVALID_UNIT', requestedAmount, budget.id);
    }
    if (!new MatchesBudgetScope().isSatisfiedBy({ budget, scope: input.scope })) {
      return decision('SCOPE_MISMATCH', requestedAmount, budget.id);
    }
    if (!new IsBudgetActive().isSatisfiedBy({ budget, now: input.now })) {
      return decision('OUTSIDE_BUDGET_PERIOD', requestedAmount, budget.id);
    }
    const remainingAmount = budget.limit.amount - input.usage.actualSpent.amount - input.usage.committedSpend.amount;
    if (remainingAmount <= 0n) return decision('BUDGET_EXHAUSTED', requestedAmount, budget.id, remainingAmount);
    if (!new HasRemainingBudget().isSatisfiedBy({ budget, usage: input.usage, requested: input.requested })) {
      return decision('REQUEST_EXCEEDS_REMAINING', requestedAmount, budget.id, remainingAmount);
    }
    if (!new HasEligibleFunding().isSatisfiedBy({ budget, requested: input.requested, funding: input.funding })) {
      return decision('INSUFFICIENT_FINALIZED_REVENUE', requestedAmount, budget.id, remainingAmount);
    }
    return { allowed: true, reason: 'ALLOWED', requestedAmount, remainingAmount, budgetId: budget.id };
  }
}

function circuitDenial(circuit: EconomicCircuit): BudgetDecisionReason | undefined {
  if (!new IsEconomicCircuitClosed().isSatisfiedBy(circuit)) {
    return circuit.state === 'OPEN' ? 'ECONOMIC_CIRCUIT_OPEN' : 'SPENDING_DISABLED';
  }
  return undefined;
}

function sameUnit(budgetUnit: BudgetUnit, requestedUnit: BudgetUnit, usage: BudgetUsage): boolean {
  return budgetUnit === requestedUnit && budgetUnit === usage.actualSpent.unit && budgetUnit === usage.committedSpend.unit;
}

function decision(
  reason: BudgetDecisionReason,
  requestedAmount: bigint,
  budgetId?: string,
  remainingAmount?: bigint,
): BudgetDecision {
  return { allowed: false, reason, requestedAmount, budgetId, remainingAmount };
}
