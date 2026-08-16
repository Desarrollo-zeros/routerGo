import { CredentialDeployment } from '../../../../domain/entities/CredentialDeployment';

export interface DeploymentRow {
  id: string;
  gateway_id: string;
  secret_ref: string;
  quota_scope_id: string;
  pool_kind: string;
  status: string;
  cooldown_until: string | Date | null;
  created_at: string | Date;
}

export const CredentialDeploymentMapper = {
  toDomain(row: DeploymentRow): CredentialDeployment {
    return CredentialDeployment.create({
      id: row.id,
      gatewayId: row.gateway_id,
      endpointId: '',
      secretRef: row.secret_ref,
      quotaScopeId: row.quota_scope_id,
      poolKind: row.pool_kind as never,
      modelLogicalId: null,
      enabled: row.status === 'ACTIVE',
      cooldownUntil: row.cooldown_until ? new Date(row.cooldown_until) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.created_at),
    });
  },
  toRow(e: CredentialDeployment): DeploymentRow {
    const p = e.toProps();
    return { id: p.id, gateway_id: p.gatewayId, secret_ref: p.secretRef, quota_scope_id: p.quotaScopeId, pool_kind: p.poolKind, status: p.enabled ? 'ACTIVE' : 'DISABLED', cooldown_until: p.cooldownUntil ? p.cooldownUntil.toISOString() : null, created_at: p.createdAt.toISOString() };
  },
};
