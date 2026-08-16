import type { Pool } from 'pg';
import { EconomyBudgetPolicy, EconomicAmount, createBudgetSnapshot, createBudgetUsage, createScope, type BudgetDecision } from '../../../domain/economy/budget/EconomyBudgetPolicy';
import type { BudgetEvaluatorPort } from '../../../application/ports/outbound/BudgetEvaluatorPort';

type BudgetRow = { id: string; scope_type: 'GLOBAL' | 'PROVIDER' | 'MODEL'; scope_id: string | null; limit_amount: string; starts_at: Date; ends_at: Date };

export class PostgresBudgetEvaluator implements BudgetEvaluatorPort {
  constructor(private readonly pool: Pool, private readonly policy = new EconomyBudgetPolicy()) {}

  async evaluate(input: { modelId: string; gatewayId: string; estimatedPlatformCostMicrousd: bigint; now: Date }): Promise<BudgetDecision> {
    const budget = await this.loadBudget(input);
    if (!budget) return this.policy.evaluate({ budget: null, scope: createScope('MODEL', input.modelId), requested: EconomicAmount.of(input.estimatedPlatformCostMicrousd, 'USD_MICRO'), usage: createBudgetUsage(EconomicAmount.of(0n, 'USD_MICRO'), EconomicAmount.of(0n, 'USD_MICRO')), now: input.now, circuit: { state: 'CLOSED', spendingEnabled: true } });
    const actual = await this.actualSpend(budget, input);
    return this.policy.evaluate({ budget: createBudgetSnapshot({ id: budget.id, scope: createScope(budget.scope_type, budget.scope_id ?? undefined), limit: EconomicAmount.of(BigInt(budget.limit_amount), 'USD_MICRO'), startsAt: budget.starts_at, endsAt: budget.ends_at }), scope: createScope(budget.scope_type, budget.scope_id ?? undefined), requested: EconomicAmount.of(input.estimatedPlatformCostMicrousd, 'USD_MICRO'), usage: createBudgetUsage(EconomicAmount.of(actual, 'USD_MICRO'), EconomicAmount.of(0n, 'USD_MICRO')), now: input.now, circuit: { state: 'CLOSED', spendingEnabled: true } });
  }

  private async loadBudget(input: { modelId: string; gatewayId: string; now: Date }): Promise<BudgetRow | null> {
    const result = await this.pool.query<BudgetRow>(
      `SELECT id,scope_type,scope_id,limit_amount,starts_at,ends_at FROM economy_budgets
       WHERE amount_unit='USD_MICRO' AND starts_at <= $1 AND ends_at > $1
         AND ((scope_type='MODEL' AND scope_id=$2) OR (scope_type='PROVIDER' AND scope_id=$3) OR scope_type='GLOBAL')
       ORDER BY CASE scope_type WHEN 'MODEL' THEN 1 WHEN 'PROVIDER' THEN 2 ELSE 3 END LIMIT 1`,
      [input.now, input.modelId, input.gatewayId],
    );
    return result.rows[0] ?? null;
  }

  private async actualSpend(budget: BudgetRow, input: { modelId: string; gatewayId: string }): Promise<bigint> {
    const filter = budget.scope_type === 'MODEL' ? 'model_logical_id=$1' : budget.scope_type === 'PROVIDER' ? 'provider_gateway_id=$1' : 'TRUE';
    const value = budget.scope_type === 'MODEL' ? input.modelId : input.gatewayId;
    const result = await this.pool.query<{ total: string }>(`SELECT COALESCE(SUM(cost_microusd),0)::text AS total FROM provider_cost_entries WHERE ${filter}`, budget.scope_type === 'GLOBAL' ? [] : [value]);
    return BigInt(result.rows[0]?.total ?? 0);
  }
}
