import type pg from 'pg';
import type { AdCandidate } from '../../../domain/ads/AdDecision.js';
import type { AdCandidateReader } from '../../../application/ports/outbound/AdCandidateReader.js';

type Row = {
  campaign_id: string;
  creative_id: string;
  campaign_status: string;
  campaign_moderation: string;
  sponsored_label: string;
  payload_json: unknown;
};

export class PostgresAdCandidateReader implements AdCandidateReader {
  constructor(private readonly pool: pg.Pool) {}

  async listForPlacement(placementKey: string): Promise<AdCandidate[]> {
    const result = await this.pool.query<Row>(
      `SELECT c.id campaign_id, cr.id creative_id, c.status campaign_status,
              c.moderation_status campaign_moderation, c.sponsored_label, cr.payload_json
       FROM placements p
       JOIN campaigns c ON c.status='ACTIVE' AND c.moderation_status='APPROVED'
       JOIN creatives cr ON cr.campaign_id=c.id AND cr.moderation_status='APPROVED'
       WHERE p.placement_key=$1 AND p.status='ACTIVE'
         AND (c.starts_at IS NULL OR c.starts_at <= now())
         AND (c.ends_at IS NULL OR c.ends_at > now())
       ORDER BY c.updated_at DESC, cr.created_at DESC`, [placementKey],
    );
    return result.rows.map(toCandidate);
  }
}

function toCandidate(row: Row): AdCandidate {
  return {
    campaignId: row.campaign_id,
    creativeId: row.creative_id,
    inventory: 'DIRECT',
    campaignStatus: asCampaignStatus(row.campaign_status),
    moderationStatus: asModerationStatus(row.campaign_moderation),
    sponsoredLabel: row.sponsored_label,
    payload: stringPayload(row.payload_json),
  };
}

function stringPayload(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

function asCampaignStatus(value: string): AdCandidate['campaignStatus'] {
  return value === 'PAUSED' || value === 'COMPLETED' ? value : 'ACTIVE';
}

function asModerationStatus(value: string): AdCandidate['moderationStatus'] {
  return value === 'REJECTED' || value === 'DRAFT' || value === 'REVIEW' ? value : 'APPROVED';
}
