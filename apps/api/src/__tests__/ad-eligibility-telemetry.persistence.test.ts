import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { PostgresAdEligibilityTelemetry } from '../infrastructure/adapters/postgres/PostgresAdEligibilityTelemetry.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const ids = { org: 't055-org', account: 't055-account', campaign: 't055-campaign', placement: 't055-placement' };

afterAll(async () => {
  await pool.query('DELETE FROM ad_eligibility_events WHERE campaign_id=$1', [ids.campaign]);
  await pool.query('DELETE FROM placements WHERE id=$1', [ids.placement]);
  await pool.query('DELETE FROM campaigns WHERE id=$1', [ids.campaign]);
  await pool.query('DELETE FROM advertiser_accounts WHERE id=$1', [ids.account]);
  await pool.query('DELETE FROM advertisers WHERE organization_id=$1', [ids.org]);
  await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
  await pool.end();
});

describe('ad eligibility telemetry persistence', () => {
  it('records a decision once per event key', async () => {
    await createFixture();
    const telemetry = new PostgresAdEligibilityTelemetry(pool);
    const input = { id: 't055-eligibility-1', eventKey: 't055-event-key', campaignId: ids.campaign, placementId: ids.placement, decision: 'CLICK_FRAUD_SIGNAL' as const, allowed: false, region: 'CO', consentGranted: true, impressionsInWindow: 3, frequencyCap: 3, clickRateBps: 1200, maxClickRateBps: 1000 };
    await expect(telemetry.record(input)).resolves.toBe('RECORDED');
    await expect(telemetry.record({ ...input, id: 't055-eligibility-2' })).resolves.toBe('DUPLICATE');
    const rows = await pool.query('SELECT count(*)::int AS count FROM ad_eligibility_events WHERE event_key=$1', [input.eventKey]);
    expect(rows.rows[0]?.count).toBe(1);
  });
});

async function createFixture(): Promise<void> {
  await pool.query('DELETE FROM ad_eligibility_events WHERE campaign_id=$1', [ids.campaign]);
  await pool.query('DELETE FROM placements WHERE id=$1', [ids.placement]);
  await pool.query('DELETE FROM campaigns WHERE id=$1', [ids.campaign]);
  await pool.query('DELETE FROM advertiser_accounts WHERE id=$1', [ids.account]);
  await pool.query('DELETE FROM advertisers WHERE organization_id=$1', [ids.org]);
  await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
  await pool.query("INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,'T055 Ads','t055-ads','ADVERTISER','ACTIVE')", [ids.org]);
  await pool.query('INSERT INTO advertisers(organization_id) VALUES ($1)', [ids.org]);
  await pool.query("INSERT INTO advertiser_accounts(id,organization_id,balance_micro) VALUES ($1,$2,1000000)", [ids.account, ids.org]);
  await pool.query("INSERT INTO campaigns(id,organization_id,account_id,name,budget_micro,status) VALUES ($1,$2,$3,'Campaign',1000,'ACTIVE')", [ids.campaign, ids.org, ids.account]);
  await pool.query("INSERT INTO placements(id,placement_key,surface) VALUES ($1,'t055-placement','PWA')", [ids.placement]);
}
