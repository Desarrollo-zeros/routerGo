import type { Pool } from 'pg';
import type { EventBus } from '../../../application/ports/outbound/EventBus';
import type { DomainEvent } from '../../../domain/events/DomainEvent';

export class OutboxPostgresAdapter implements EventBus {
  constructor(private readonly pool: Pool) {}

  async publish(event: DomainEvent): Promise<void> {
    await this.pool.query(
      'INSERT INTO outbox_events (id, aggregate_id, name, payload, occurred_at, processed) VALUES (gen_random_uuid(),$1,$2,$3,$4,false)',
      [event.aggregateId, event.name, JSON.stringify(event.payload), event.occurredAt],
    );
  }

  async publishMany(events: DomainEvent[]): Promise<void> {
    for (const e of events) await this.publish(e);
  }

  async fetchUnprocessed(limit = 100): Promise<DomainEvent[]> {
    const r = await this.pool.query('SELECT * FROM outbox_events WHERE processed=false ORDER BY occurred_at LIMIT $1', [limit]);
    return r.rows.map((row) => ({ name: row.name, aggregateId: row.aggregate_id, occurredAt: row.occurred_at, payload: row.payload }));
  }

  async markProcessed(id: string): Promise<void> {
    await this.pool.query('UPDATE outbox_events SET processed=true WHERE id=$1', [id]);
  }
}
