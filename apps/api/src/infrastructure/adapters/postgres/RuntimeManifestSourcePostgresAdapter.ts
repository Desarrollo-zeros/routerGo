import type pg from 'pg';
import type { RuntimeManifestSource } from '../../../config/runtime-manifest-schemas.js';

export class RuntimeManifestSourcePostgresAdapter {
  constructor(private readonly executor: pg.Pool | pg.PoolClient) {}

  async read(): Promise<RuntimeManifestSource> {
    const gateways = await this.rows('SELECT * FROM provider_gateways ORDER BY key');
    const endpoints = await this.rows('SELECT * FROM provider_endpoints ORDER BY id');
    const models = await this.rows('SELECT * FROM model_catalog ORDER BY logical_id');
    const apiRoutes = await this.rows('SELECT * FROM api_routes ORDER BY route_key');
    const uiRoutes = await this.rows('SELECT * FROM runtime_ui_routes ORDER BY route_key');
    const uiNavigation = await this.rows('SELECT * FROM ui_navigation ORDER BY order_index, route_key');
    const tokens = await this.rows('SELECT * FROM design_tokens ORDER BY theme, token_key');
    const flags = await this.rows('SELECT * FROM feature_flags ORDER BY key');
    const poolPolicies = await this.rows('SELECT * FROM pool_policies ORDER BY gateway_id, pool_kind');
    return { gateways, endpoints, models, apiRoutes, uiRoutes, uiNavigation, tokens, flags, poolPolicies } as RuntimeManifestSource;
  }

  private async rows(sql: string): Promise<Record<string, unknown>[]> {
    const result = await this.executor.query<Record<string, unknown>>(sql);
    return result.rows;
  }
}
