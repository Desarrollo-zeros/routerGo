import type {
  BudgetSnapshot,
  BudgetScope,
  BudgetUsage,
  EconomicCircuit,
  EconomicAmount,
  RevenueFunding,
} from './budget-types.js';

export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

export class IsEconomicCircuitClosed implements Specification<EconomicCircuit> {
  isSatisfiedBy(candidate: EconomicCircuit): boolean {
    return candidate.state === 'CLOSED' && candidate.spendingEnabled;
  }
}

export class IsBudgetActive implements Specification<{ budget: BudgetSnapshot; now: Date }> {
  isSatisfiedBy(candidate: { budget: BudgetSnapshot; now: Date }): boolean {
    return candidate.now >= candidate.budget.startsAt && candidate.now < candidate.budget.endsAt;
  }
}

export class MatchesBudgetScope implements Specification<{ budget: BudgetSnapshot; scope: BudgetScope }> {
  isSatisfiedBy(candidate: { budget: BudgetSnapshot; scope: BudgetScope }): boolean {
    const { budget, scope } = candidate;
    return budget.scope.type === scope.type && budget.scope.id === scope.id;
  }
}

export class HasRemainingBudget implements Specification<{
  budget: BudgetSnapshot;
  usage: BudgetUsage;
  requested: EconomicAmount;
}> {
  isSatisfiedBy(candidate: { budget: BudgetSnapshot; usage: BudgetUsage; requested: EconomicAmount }): boolean {
    const committed = candidate.usage.actualSpent.amount + candidate.usage.committedSpend.amount;
    return committed + candidate.requested.amount <= candidate.budget.limit.amount;
  }
}

export class HasEligibleFunding implements Specification<{
  budget: BudgetSnapshot;
  requested: EconomicAmount;
  funding?: RevenueFunding;
}> {
  isSatisfiedBy(candidate: { budget: BudgetSnapshot; requested: EconomicAmount; funding?: RevenueFunding }): boolean {
    if (candidate.budget.scope.type !== 'AD_FUNDED_COMPUTE') return true;
    if (!candidate.funding) return false;
    const available = candidate.funding.finalizedRevenueMicrousd - candidate.funding.recognizedCostMicrousd;
    return available >= candidate.requested.amount;
  }
}

export function and<T>(left: Specification<T>, right: Specification<T>): Specification<T> {
  return { isSatisfiedBy: (candidate) => left.isSatisfiedBy(candidate) && right.isSatisfiedBy(candidate) };
}
