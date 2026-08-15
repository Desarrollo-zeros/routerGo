import type { JsonObject } from '../../contracts/JsonValue';
import type { AppendResult } from './AuditLogAppender';

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: JsonObject;
  occurredAt: Date;
}

export interface OutboxAppender {
  append(event: OutboxEvent): Promise<AppendResult>;
}
