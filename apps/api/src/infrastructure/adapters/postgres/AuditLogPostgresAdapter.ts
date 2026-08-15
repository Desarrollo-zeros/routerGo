import type { PoolClient } from 'pg';
import type { AuditLogAppender, AuditLogEntry, AppendResult } from '../../../application/ports/outbound/AuditLogAppender';

export class AuditLogPostgresAdapter implements AuditLogAppender {
  constructor(private readonly client: PoolClient) {}

  async append(entry: AuditLogEntry): Promise<AppendResult> {
    const result = await this.client.query(
      `INSERT INTO audit_logs
       (id, actor_user_id, actor_organization_id, action, resource_type, resource_id, metadata, correlation_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [entry.id, entry.actorUserId, entry.actorOrganizationId, entry.action, entry.resourceType, entry.resourceId, entry.metadata, entry.correlationId, entry.createdAt],
    );
    return result.rowCount === 1 ? 'APPENDED' : 'DUPLICATE';
  }
}
