import type pg from 'pg';
import { GetEconomyUseCase } from '../application/use-cases/GetEconomy.js';

export function createEconomy(pool: pg.Pool): GetEconomyUseCase {
  return new GetEconomyUseCase({
    getGoCount: async () => queryGoCount(pool),
    getWindows: async () => queryWindows(pool),
    getOperatorRevenueMicro: async () => queryRevenue(pool),
    getProviderCostMicro: async () => queryProviderCost(pool),
    getRewardLiabilityCredits: async () => queryRewardLiability(pool),
  });
}

async function queryGoCount(pool: pg.Pool): Promise<number> {
  const result = await pool.query("SELECT count(*)::int as c FROM credential_deployments WHERE pool_kind='GO' AND status='ACTIVE'");
  return result.rows[0]?.c ?? 0;
}

async function queryWindows(pool: pg.Pool): Promise<Array<{ quotaScopeId: string; windowType: string; usedMicro: number }>> {
  const result = await pool.query('SELECT quota_scope_id as "quotaScopeId", window_type as "windowType", used_value::int as "usedMicro" FROM credential_usage_windows');
  return result.rows;
}

async function queryRevenue(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ total: string }>("SELECT COALESCE(SUM(net_revenue_microusd), 0)::text AS total FROM revenue_entries WHERE status='FINALIZED'");
  return Number(result.rows[0]?.total ?? 0);
}

async function queryProviderCost(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ total: string }>("SELECT COALESCE(SUM(cost_microusd), 0)::text AS total FROM provider_cost_entries WHERE source <> 'REVERSAL'");
  return Number(result.rows[0]?.total ?? 0);
}

async function queryRewardLiability(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ total: string }>('SELECT COALESCE(SUM(balance), 0)::text AS total FROM wallets');
  return Number(result.rows[0]?.total ?? 0);
}
