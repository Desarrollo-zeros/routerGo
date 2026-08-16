import type pg from 'pg';
import type { ProviderAnalyticsSource } from '../../../application/ports/inbound/GetProviderAnalyticsPort.js';
import type { ProviderHealthProbe } from '../../../application/ports/outbound/ProviderHealthProbe.js';

type Row = { gateway_id: string; base_url: string | null; quota_usage_pct: string; cost_micro: string };

export class PostgresProviderAnalyticsSource implements ProviderAnalyticsSource {
  constructor(private readonly pool: pg.Pool, private readonly probe: ProviderHealthProbe) {}

  async read(): Promise<Array<{ gatewayId: string; health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'; quotaUsagePct: number; costMicro: number }>> {
    const result = await this.pool.query<Row>(`
      WITH usage AS (
        SELECT d.gateway_id, MAX(CASE WHEN w.limit_value > 0 THEN w.used_value::numeric * 100 / w.limit_value ELSE 0 END) AS quota_usage_pct
        FROM credential_deployments d LEFT JOIN credential_usage_windows w ON w.quota_scope_id = d.quota_scope_id
        GROUP BY d.gateway_id
      ), costs AS (
        SELECT provider_gateway_id AS gateway_id, COALESCE(SUM(cost_microusd), 0) AS cost_micro
        FROM provider_cost_entries WHERE source <> 'REVERSAL' GROUP BY provider_gateway_id
      ), endpoints AS (
        SELECT gateway_id, MIN(base_url) AS base_url FROM provider_endpoints WHERE enabled = true GROUP BY gateway_id
      )
      SELECT g.id AS gateway_id, e.base_url, COALESCE(u.quota_usage_pct, 0) AS quota_usage_pct, COALESCE(c.cost_micro, 0) AS cost_micro
      FROM provider_gateways g LEFT JOIN endpoints e ON e.gateway_id = g.id
      LEFT JOIN usage u ON u.gateway_id = g.id LEFT JOIN costs c ON c.gateway_id = g.id
      ORDER BY g.id`);
    return Promise.all(result.rows.map((row) => this.mapRow(row)));
  }

  private async mapRow(row: Row) {
    const health = await this.probe.check({ gatewayId: row.gateway_id, baseUrl: row.base_url ?? '' });
    return { gatewayId: row.gateway_id, health, quotaUsagePct: Number(row.quota_usage_pct), costMicro: Number(row.cost_micro) };
  }
}
