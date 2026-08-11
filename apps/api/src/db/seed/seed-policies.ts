import type pg from 'pg';

const REWARD_POLICIES = [
  { id: 'reward-flex-v1', activity_type: 'flex', credits_per_rep: 500, daily_cap: 50, effective_at: '2026-08-10T00:00:00Z' },
];

const POOL_POLICIES = [
  { gateway_id: 'gw-zen', pool_kind: 'ZEN_FREE', min_active: 1, max_pct: 80 },
  { gateway_id: 'gw-zen', pool_kind: 'ZEN_PAID', min_active: 1, max_pct: 80 },
  { gateway_id: 'gw-go', pool_kind: 'GO', min_active: 1, max_pct: 80 },
];

export async function seedPolicies(client: pg.PoolClient): Promise<void> {
  for (const p of REWARD_POLICIES) {
    await client.query(
      `INSERT INTO reward_policies(id, activity_type, credits_per_rep, daily_cap, effective_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET credits_per_rep=EXCLUDED.credits_per_rep, daily_cap=EXCLUDED.daily_cap, effective_at=EXCLUDED.effective_at`,
      [p.id, p.activity_type, p.credits_per_rep, p.daily_cap, p.effective_at],
    );
  }
  for (const pp of POOL_POLICIES) {
    await client.query(
      `INSERT INTO pool_policies(gateway_id, pool_kind, min_active_deployments, max_window_pct, enabled)
       VALUES ($1,$2,$3,$4,true)
       ON CONFLICT (gateway_id, pool_kind) DO UPDATE SET min_active_deployments=EXCLUDED.min_active_deployments, max_window_pct=EXCLUDED.max_window_pct, enabled=true`,
      [pp.gateway_id, pp.pool_kind, pp.min_active, pp.max_pct],
    );
  }
}
