import type { JsonObject } from '../../contracts/JsonValue';

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  actorOrganizationId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: JsonObject;
  correlationId: string;
  createdAt: Date;
}

export type AppendResult = 'APPENDED' | 'DUPLICATE';

export interface AuditLogAppender {
  append(entry: AuditLogEntry): Promise<AppendResult>;
}
