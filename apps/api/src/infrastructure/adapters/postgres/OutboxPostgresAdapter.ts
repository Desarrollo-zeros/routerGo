import type { Pool } from 'pg';
import type { EventBus } from '../../../application/ports/outbound/EventBus';
import type { DomainEvent } from '../../../domain/events/DomainEvent';

export class OutboxPostgresAdapter implements EventBus {
  constructor(private readonly pool: Pool) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.pool.query(
      'INSERT INTO outbox_events (id,event_type,aggregate_type,aggregate_id,payload_json,occurred_at,published_at,attempts) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,NULL,0)',
      [event.name, 'RouterGoAggregate', event.aggregateId, JSON.stringify(event.payload), event.occurredAt],
    );
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const e of events) await this.publish(e);
  }

  async fetchUnprocessed(limit = 100): Promise<DomainEvent[]> {
    const r = await this.pool.query('SELECT * FROM outbox_events WHERE published_at IS NULL ORDER BY occurred_at LIMIT $1', [limit]);
    return r.rows.map((row) => ({ name: row.event_type, aggregateId: row.aggregate_id, occurredAt: row.occurred_at, payload: row.payload_json }));
  }

  async markProcessed(id: string): Promise<void> {
    await this.pool.query('UPDATE outbox_events SET published_at=now(), attempts=attempts+1 WHERE id=$1', [id]);
  }
}
