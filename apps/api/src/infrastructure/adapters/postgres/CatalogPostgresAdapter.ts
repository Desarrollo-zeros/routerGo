import type { Pool } from 'pg';
import type { CatalogPort, CatalogModel } from '../../../application/ports/outbound/CatalogPort';

export class CatalogPostgresAdapter implements CatalogPort {
  constructor(private readonly pool: Pool) {}

  async getModel(logicalId: string): Promise<CatalogModel | null> {
    const r = await this.pool.query('SELECT * FROM model_catalog WHERE logical_id=$1', [logicalId]);
    if (!r.rows[0]) return null;
    return this.map(r.rows[0]);
  }

  async listModels(): Promise<CatalogModel[]> {
    const r = await this.pool.query('SELECT * FROM model_catalog WHERE enabled=true ORDER BY logical_id');
    return r.rows.map(this.map);
  }

  async isEnabled(logicalId: string): Promise<boolean> {
    const m = await this.getModel(logicalId);
    return !!m?.enabled;
  }

  private map(row: Record<string, unknown>): CatalogModel {
    return {
      logicalId: row.logical_id as string,
      providerModelId: row.provider_model_id as string,
      gatewayId: row.gateway_id as string,
      tier: row.tier as string,
      creditPrice: BigInt(row.credit_price as string),
      enabled: row.enabled as boolean,
      capabilities: (row.capabilities_json as Record<string, unknown>) ?? {},
    };
  }
}
