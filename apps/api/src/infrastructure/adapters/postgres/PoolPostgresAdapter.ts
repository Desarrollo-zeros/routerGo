import type { Pool } from 'pg';
import type { PoolPort } from '../../../application/ports/outbound/PoolPort';
import { CredentialDeploymentMapper } from './mappers/CredentialDeploymentMapper';
import { UsageWindow } from '../../../domain/value-objects/UsageWindow';

export class PoolPostgresAdapter implements PoolPort {
  constructor(private readonly pool: Pool) {}

  async getEligibleDeployments(modelId: string, now: Date): Promise<import('../../../domain/entities/CredentialDeployment').CredentialDeployment[]> {
    const r = await this.pool.query(
      `SELECT d.*
       FROM credential_deployments d
       JOIN model_catalog m ON m.gateway_id=d.gateway_id
       WHERE m.logical_id=$1 AND d.status='ACTIVE'
         AND (d.cooldown_until IS NULL OR d.cooldown_until <= $2)`,
      [modelId, now],
    );
    return r.rows.map(CredentialDeploymentMapper.toDomain);
  }

  async getUsageWindows(scopeId: string): Promise<UsageWindow[]> {
    const r = await this.pool.query('SELECT * FROM credential_usage_windows WHERE quota_scope_id=$1', [scopeId]);
    return r.rows.map(
      (row) =>
        new UsageWindow({
          scopeId: row.quota_scope_id,
          windowKind: row.window_type,
          used: Number(row.used_value),
          limit: Number(row.limit_value),
          windowStart: new Date(row.starts_at),
          windowEnd: new Date(row.ends_at),
        }),
    );
  }

  async recordUsage(deploymentId: string, tokens: number): Promise<void> {
    await this.pool.query('UPDATE credential_usage_windows SET used_value = used_value + $2 WHERE quota_scope_id = (SELECT quota_scope_id FROM credential_deployments WHERE id=$1)', [
      deploymentId,
      tokens,
    ]);
  }
}
