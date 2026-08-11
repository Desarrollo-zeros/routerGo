import type pg from 'pg';

type Dep = { id: string; gateway_id: string; pool_kind: string; secret_ref: string; quota_scope_id: string };

const DEPLOYMENTS: Dep[] = [
  // N=3 Zen FREE
  { id: 'dep-zen-free-1', gateway_id: 'gw-zen', pool_kind: 'ZEN_FREE', secret_ref: 'vault://zen-free-1', quota_scope_id: 'scope-zen-free-1' },
  { id: 'dep-zen-free-2', gateway_id: 'gw-zen', pool_kind: 'ZEN_FREE', secret_ref: 'vault://zen-free-2', quota_scope_id: 'scope-zen-free-2' },
  { id: 'dep-zen-free-3', gateway_id: 'gw-zen', pool_kind: 'ZEN_FREE', secret_ref: 'vault://zen-free-3', quota_scope_id: 'scope-zen-free-3' },
  // M=3 Go
  { id: 'dep-go-1', gateway_id: 'gw-go', pool_kind: 'GO', secret_ref: 'vault://go-1', quota_scope_id: 'scope-go-1' },
  { id: 'dep-go-2', gateway_id: 'gw-go', pool_kind: 'GO', secret_ref: 'vault://go-2', quota_scope_id: 'scope-go-2' },
  { id: 'dep-go-3', gateway_id: 'gw-go', pool_kind: 'GO', secret_ref: 'vault://go-3', quota_scope_id: 'scope-go-3' },
  // P=2 Zen paid
  { id: 'dep-zen-paid-1', gateway_id: 'gw-zen', pool_kind: 'ZEN_PAID', secret_ref: 'vault://zen-paid-1', quota_scope_id: 'scope-zen-paid-1' },
  { id: 'dep-zen-paid-2', gateway_id: 'gw-zen', pool_kind: 'ZEN_PAID', secret_ref: 'vault://zen-paid-2', quota_scope_id: 'scope-zen-paid-2' },
];

export async function seedCredentials(client: pg.PoolClient): Promise<void> {
  for (const d of DEPLOYMENTS) {
    await client.query(
      `INSERT INTO credential_deployments(id, gateway_id, pool_kind, secret_ref, quota_scope_id, status)
       VALUES ($1,$2,$3,$4,$5,'ACTIVE')
       ON CONFLICT (id) DO UPDATE SET gateway_id=EXCLUDED.gateway_id, pool_kind=EXCLUDED.pool_kind, secret_ref=EXCLUDED.secret_ref, quota_scope_id=EXCLUDED.quota_scope_id, status='ACTIVE'`,
      [d.id, d.gateway_id, d.pool_kind, d.secret_ref, d.quota_scope_id],
    );
    await seedWindow(client, d.quota_scope_id);
  }
}

async function seedWindow(client: pg.PoolClient, scope: string): Promise<void> {
  const windows: [string, string, number][] = [
    ['5H', 'USD_MICRO', 12_000_000],
    ['WEEK', 'USD_MICRO', 30_000_000],
    ['MONTH', 'USD_MICRO', 60_000_000],
  ];
  for (const [wt, unit, limit] of windows) {
    await client.query(
      `INSERT INTO credential_usage_windows(quota_scope_id, window_type, starts_at, ends_at, unit, used_value, limit_value, source)
       VALUES ($1,$2, now(), now() + interval '1 month', $3, 0, $4, 'seed')
       ON CONFLICT (quota_scope_id, window_type) DO UPDATE SET limit_value=EXCLUDED.limit_value, unit=EXCLUDED.unit`,
      [scope, wt, unit, limit],
    );
  }
}
