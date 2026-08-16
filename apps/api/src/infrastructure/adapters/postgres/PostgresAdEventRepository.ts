import type { Pool } from 'pg';
import type { AdEventRepository, CampaignEventInput, CampaignEventResult } from '../../../application/ports/outbound/AdEventRepository.js';

export class PostgresAdEventRepository implements AdEventRepository {
  constructor(private readonly pool: Pool) {}

  async recordCampaignEvent(input: CampaignEventInput): Promise<CampaignEventResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await this.insertEvent(client, input);
      if (!inserted) {
        await client.query('ROLLBACK');
        return 'DUPLICATE';
      }
      await this.applySpend(client, input);
      await client.query('COMMIT');
      return 'RECORDED';
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertEvent(client: { query: Pool['query'] }, input: CampaignEventInput): Promise<boolean> {
    const result = await client.query(
      `INSERT INTO campaign_events(id,campaign_id,placement_id,event_key,event_type,amount_micro,metadata_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (event_key) DO NOTHING`,
      [input.id, input.campaignId, input.placementId ?? null, input.eventKey, input.eventType, input.amountMicro.toString(), input.metadata ?? {}],
    );
    return (result.rowCount ?? 0) === 1;
  }

  private async applySpend(client: { query: Pool['query'] }, input: CampaignEventInput): Promise<void> {
    if (input.amountMicro === 0n) return;
    const result = await client.query(
      `UPDATE campaigns SET spent_micro=spent_micro+$1, updated_at=now()
       WHERE id=$2 AND status='ACTIVE' AND spent_micro+$1 <= budget_micro`,
      [input.amountMicro.toString(), input.campaignId],
    );
    if ((result.rowCount ?? 0) !== 1) throw new Error('CAMPAIGN_BUDGET_EXCEEDED');
  }
}
