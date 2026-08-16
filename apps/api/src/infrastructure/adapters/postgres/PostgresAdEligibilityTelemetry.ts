import type { Pool } from 'pg';
import type { AdEligibilityTelemetry, AdEligibilityTelemetryInput, AdEligibilityTelemetryResult } from '../../../application/ports/outbound/AdEligibilityTelemetry.js';

export class PostgresAdEligibilityTelemetry implements AdEligibilityTelemetry {
  constructor(private readonly pool: Pool) {}

  async record(input: AdEligibilityTelemetryInput): Promise<AdEligibilityTelemetryResult> {
    const result = await this.pool.query(
      `INSERT INTO ad_eligibility_events
       (id,event_key,campaign_id,placement_id,decision,allowed,region_code,consent_granted,
        impressions_in_window,frequency_cap,click_rate_bps,max_click_rate_bps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (event_key) DO NOTHING`,
      [input.id, input.eventKey, input.campaignId, input.placementId ?? null, input.decision, input.allowed, input.region, input.consentGranted, input.impressionsInWindow, input.frequencyCap, input.clickRateBps, input.maxClickRateBps],
    );
    return result.rowCount === 1 ? 'RECORDED' : 'DUPLICATE';
  }
}
