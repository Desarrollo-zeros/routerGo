import { describe, expect, it } from 'vitest';
import { PostgresProviderAnalyticsSource } from './PostgresProviderAnalyticsSource.js';

describe('PostgresProviderAnalyticsSource', () => {
  it('combines aggregated cost/quota rows with explicit health probes', async () => {
    const pool = { query: async () => ({ rows: [{ gateway_id: 'gw-go', base_url: 'http://provider', quota_usage_pct: '82.5', cost_micro: '19' }] }) };
    const probe = { check: async () => 'DEGRADED' as const };

    await expect(new PostgresProviderAnalyticsSource(pool as never, probe).read()).resolves.toEqual([{ gatewayId: 'gw-go', health: 'DEGRADED', quotaUsagePct: 82.5, costMicro: 19 }]);
  });
});
