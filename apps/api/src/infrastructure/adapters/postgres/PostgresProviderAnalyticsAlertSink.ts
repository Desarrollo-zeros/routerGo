import type pg from 'pg';
import type { ProviderAnalyticsAlertSink } from '../../../application/ports/inbound/GetProviderAnalyticsPort.js';
import type { ProviderAnalyticsSummary } from '../../../domain/providers/ProviderAnalytics.js';

export class PostgresProviderAnalyticsAlertSink implements ProviderAnalyticsAlertSink {
  constructor(private readonly pool: pg.Pool) {}

  async record(summary: ProviderAnalyticsSummary): Promise<void> {
    const id = `provider-alert:${summary.gatewayId}:${summary.alert}`;
    await this.pool.query(
      `INSERT INTO outbox_events(id, event_type, aggregate_type, aggregate_id, payload_json)
       VALUES ($1, 'PROVIDER_ANALYTICS_ALERT', 'provider_gateway', $2, $3::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [id, summary.gatewayId, JSON.stringify(summary)],
    );
  }
}
