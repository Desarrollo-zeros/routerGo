import type { Pool } from 'pg';
import type { AdvertiserAnalyticsView, AdvertiserCampaignView, AdvertiserCreativeView, AdvertiserReader, AdvertiserWriter, AdvertiserAccountView } from '../../../application/ports/inbound/AdvertiserPort.js';

type CampaignRow = { id: string; name: string; status: string; moderation_status: string; budget_micro: string; spent_micro: string; sponsored_label: string };
type CreativeRow = { id: string; campaign_id: string; kind: string; moderation_status: string; payload_json: Record<string, unknown> };

export class PostgresAdvertiserRepository implements AdvertiserReader, AdvertiserWriter {
  constructor(private readonly pool: Pool) {}

  async account(organizationId: string): Promise<AdvertiserAccountView> {
    const result = await this.pool.query<{ id: string; balance_micro: string; currency_code: 'USD'; status: string }>(
      'SELECT id,balance_micro::text,currency_code,status FROM advertiser_accounts WHERE organization_id=$1', [organizationId]);
    const row = result.rows[0];
    if (!row) throw new Error('ADVERTISER_ACCOUNT_NOT_FOUND');
    return { accountId: row.id, balanceMicro: row.balance_micro, currency: row.currency_code, status: row.status };
  }

  async campaigns(organizationId: string): Promise<AdvertiserCampaignView[]> {
    const result = await this.pool.query<CampaignRow>('SELECT id,name,status,moderation_status,budget_micro::text,spent_micro::text,sponsored_label FROM campaigns WHERE organization_id=$1 ORDER BY updated_at DESC', [organizationId]);
    return result.rows.map(toCampaign);
  }

  async creatives(organizationId: string): Promise<AdvertiserCreativeView[]> {
    const result = await this.pool.query<CreativeRow>('SELECT c.id,c.campaign_id,c.kind,c.moderation_status,c.payload_json FROM creatives c JOIN campaigns p ON p.id=c.campaign_id WHERE p.organization_id=$1 ORDER BY c.id', [organizationId]);
    return result.rows.map(toCreative);
  }

  async analytics(organizationId: string): Promise<AdvertiserAnalyticsView> {
    const result = await this.pool.query<{ impressions: string; clicks: string; conversions: string; spend_micro: string }>(
      `SELECT COUNT(*) FILTER (WHERE e.event_type='IMPRESSION')::text impressions,
              COUNT(*) FILTER (WHERE e.event_type='CLICK')::text clicks,
              COUNT(*) FILTER (WHERE e.event_type='CONVERSION')::text conversions,
              COALESCE(SUM(e.amount_micro),0)::text spend_micro
       FROM campaign_events e JOIN campaigns c ON c.id=e.campaign_id WHERE c.organization_id=$1`, [organizationId]);
    const row = result.rows[0];
    return { impressions: Number(row?.impressions ?? 0), clicks: Number(row?.clicks ?? 0), conversions: Number(row?.conversions ?? 0), spendMicro: row?.spend_micro ?? '0' };
  }

  async createCampaign(input: { organizationId: string; name: string; budgetMicro: bigint; sponsoredLabel: string }): Promise<AdvertiserCampaignView> {
    const account = await this.account(input.organizationId);
    const result = await this.pool.query<CampaignRow>(
      `INSERT INTO campaigns(id,organization_id,account_id,name,status,moderation_status,budget_micro,sponsored_label)
       VALUES (gen_random_uuid()::text,$1,$2,$3,'DRAFT','DRAFT',$4,$5)
       RETURNING id,name,status,moderation_status,budget_micro::text,spent_micro::text,sponsored_label`,
      [input.organizationId, account.accountId, input.name.trim(), input.budgetMicro.toString(), input.sponsoredLabel.trim()]);
    return toCampaign(result.rows[0]);
  }

  async createCreative(input: { organizationId: string; campaignId: string; kind: string; payload: Record<string, unknown> }): Promise<AdvertiserCreativeView> {
    const result = await this.pool.query<CreativeRow>(
      `INSERT INTO creatives(id,campaign_id,kind,payload_json,moderation_status)
       SELECT gen_random_uuid()::text,c.id,$3,$4,'DRAFT' FROM campaigns c WHERE c.id=$1 AND c.organization_id=$2
       RETURNING id,campaign_id,kind,moderation_status,payload_json`, [input.campaignId, input.organizationId, input.kind, input.payload]);
    if (!result.rows[0]) throw new Error('CAMPAIGN_NOT_FOUND');
    return toCreative(result.rows[0]);
  }

  async submitCampaign(input: { organizationId: string; campaignId: string }): Promise<AdvertiserCampaignView> {
    const result = await this.pool.query<CampaignRow>(
      `UPDATE campaigns SET status='REVIEW',moderation_status='REVIEW',updated_at=now()
       WHERE id=$1 AND organization_id=$2 AND status='DRAFT'
       RETURNING id,name,status,moderation_status,budget_micro::text,spent_micro::text,sponsored_label`, [input.campaignId, input.organizationId]);
    if (!result.rows[0]) throw new Error('CAMPAIGN_NOT_DRAFT_OR_NOT_FOUND');
    return toCampaign(result.rows[0]);
  }

}

function toCampaign(row: CampaignRow): AdvertiserCampaignView { return { id: row.id, name: row.name, status: row.status, moderationStatus: row.moderation_status, budgetMicro: row.budget_micro, spentMicro: row.spent_micro, sponsoredLabel: row.sponsored_label }; }
function toCreative(row: CreativeRow): AdvertiserCreativeView { return { id: row.id, campaignId: row.campaign_id, kind: row.kind, moderationStatus: row.moderation_status, payload: row.payload_json }; }
