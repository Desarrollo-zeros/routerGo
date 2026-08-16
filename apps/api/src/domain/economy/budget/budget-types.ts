export const BUDGET_UNITS = ['CREDITS', 'USD_MICRO'] as const;
export type BudgetUnit = typeof BUDGET_UNITS[number];
export const BUDGET_SCOPE_TYPES = ['GLOBAL', 'PROVIDER', 'MODEL', 'REWARD', 'AD_FUNDED_COMPUTE'] as const;
export type BudgetScopeType = typeof BUDGET_SCOPE_TYPES[number];

export class EconomicAmount {
  private constructor(readonly amount: bigint, readonly unit: BudgetUnit) {}

  static of(amount: bigint, unit: BudgetUnit): EconomicAmount {
    return new EconomicAmount(amount, unit);
  }
}

export interface BudgetScope {
  readonly type: BudgetScopeType;
  readonly id?: string;
}

export function createScope(type: BudgetScopeType, id?: string): BudgetScope {
  if (type === 'GLOBAL' && id !== undefined) throw new Error('Global scope cannot have an id');
  if (type !== 'GLOBAL' && (!id || id.trim().length === 0)) throw new Error('Scoped budget requires an id');
  return id === undefined ? { type } : { type, id };
}

export interface BudgetSnapshot {
  readonly id: string;
  readonly scope: BudgetScope;
  readonly limit: EconomicAmount;
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export function createBudgetSnapshot(input: {
  id: string;
  scope: BudgetScope;
  limit: EconomicAmount;
  startsAt: Date;
  endsAt: Date;
}): BudgetSnapshot {
  if (input.id.trim().length === 0 || input.limit.amount <= 0n) throw new Error('Budget requires a positive id and limit');
  if (input.endsAt <= input.startsAt) throw new Error('Budget period must end after it starts');
  return { ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) };
}

export interface BudgetUsage {
  readonly actualSpent: EconomicAmount;
  readonly committedSpend: EconomicAmount;
}

export function createBudgetUsage(actualSpent: EconomicAmount, committedSpend: EconomicAmount): BudgetUsage {
  if (actualSpent.unit !== committedSpend.unit || actualSpent.amount < 0n || committedSpend.amount < 0n) {
    throw new Error('Budget usage must be non-negative and use one unit');
  }
  return { actualSpent, committedSpend };
}

export interface RevenueFunding {
  readonly finalizedRevenueMicrousd: bigint;
  readonly pendingRevenueMicrousd: bigint;
  readonly reversedRevenueMicrousd: bigint;
  readonly recognizedCostMicrousd: bigint;
}

export function createRevenueFunding(
  finalizedRevenueMicrousd: bigint,
  pendingRevenueMicrousd: bigint,
  reversedRevenueMicrousd: bigint,
  recognizedCostMicrousd: bigint,
): RevenueFunding {
  const amounts = [finalizedRevenueMicrousd, pendingRevenueMicrousd, reversedRevenueMicrousd, recognizedCostMicrousd];
  if (amounts.some((amount) => amount < 0n)) throw new Error('Revenue funding cannot be negative');
  return { finalizedRevenueMicrousd, pendingRevenueMicrousd, reversedRevenueMicrousd, recognizedCostMicrousd };
}

export type EconomicCircuitState = 'CLOSED' | 'OPEN';
export interface EconomicCircuit {
  readonly state: EconomicCircuitState;
  readonly spendingEnabled: boolean;
}
