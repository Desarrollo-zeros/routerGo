import { CredentialDeployment } from '../../../../domain/entities/CredentialDeployment';

export interface DeploymentRow {
  id: string;
  gateway_id: string;
  endpoint_id: string;
  secret_ref: string;
  quota_scope_id: string;
  pool_kind: string;
  model_logical_id: string | null;
  enabled: boolean;
  cooldown_until: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export const CredentialDeploymentMapper = {
  toDomain(row: DeploymentRow): CredentialDeployment {
    return CredentialDeployment.create({
      id: row.id,
      gatewayId: row.gateway_id,
      endpointId: row.endpoint_id,
      secretRef: row.secret_ref,
      quotaScopeId: row.quota_scope_id,
      poolKind: row.pool_kind as never,
      modelLogicalId: row.model_logical_id,
      enabled: row.enabled,
      cooldownUntil: row.cooldown_until ? new Date(row.cooldown_until) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  },
  toRow(e: CredentialDeployment): DeploymentRow {
    const p = e.toProps();
    return { id: p.id, gateway_id: p.gatewayId, endpoint_id: p.endpointId, secret_ref: p.secretRef, quota_scope_id: p.quotaScopeId, pool_kind: p.poolKind, model_logical_id: p.modelLogicalId, enabled: p.enabled, cooldown_until: p.cooldownUntil ? p.cooldownUntil.toISOString() : null, created_at: p.createdAt.toISOString(), updated_at: p.updatedAt.toISOString() };
  },
};
