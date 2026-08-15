import type { PoolClient } from 'pg';
import type { AppendResult } from '../../../application/ports/outbound/AuditLogAppender';
import type { OutboxAppender, OutboxEvent } from '../../../application/ports/outbound/OutboxAppender';

export class PrivilegedOutboxPostgresAdapter implements OutboxAppender {
  constructor(private readonly client: PoolClient) {}

  async append(event: OutboxEvent): Promise<AppendResult> {
    const result = await this.client.query(
      `INSERT INTO outbox_events
       (id, event_type, aggregate_type, aggregate_id, payload_json, occurred_at, published_at, attempts)
       VALUES ($1,$2,$3,$4,$5,$6,NULL,0)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.eventType, event.aggregateType, event.aggregateId, event.payload, event.occurredAt],
    );
    return result.rowCount === 1 ? 'APPENDED' : 'DUPLICATE';
  }
}
