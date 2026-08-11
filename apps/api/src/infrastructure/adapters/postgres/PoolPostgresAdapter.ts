import type { Pool } from 'pg';
import type { PoolPort } from '../../../application/ports/outbound/PoolPort';
import { CredentialDeploymentMapper } from './mappers/CredentialDeploymentMapper';
import { UsageWindow } from '../../../domain/value-objects/UsageWindow';

export class PoolPostgresAdapter implements PoolPort {
  constructor(private readonly pool: Pool) {}

  async getEligibleDeployments(modelId: string, now: Date): Promise<import('../../../domain/entities/CredentialDeployment').CredentialDeployment[]> {
    const r = await this.pool.query(
      "SELECT * FROM credential_deployments WHERE (model_logical_id=$1 OR model_logical_id IS NULL) AND enabled=true AND (cooldown_until IS NULL OR cooldown_until <= $2)",
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
          windowKind: row.window_kind,
          used: Number(row.used),
          limit: Number(row.limit_value),
          windowStart: new Date(row.window_start),
          windowEnd: new Date(row.window_end),
        }),
    );
  }

  async recordUsage(deploymentId: string, tokens: number): Promise<void> {
    await this.pool.query('UPDATE credential_usage_windows SET used = used + $2 WHERE quota_scope_id = (SELECT quota_scope_id FROM credential_deployments WHERE id=$1)', [
      deploymentId,
      tokens,
    ]);
  }
}
