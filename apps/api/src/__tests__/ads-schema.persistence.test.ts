import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });

const ids = { org: 't050-org', account: 't050-account', campaign: 't050-campaign', placement: 't050-placement' };

afterAll(async () => {
  await pool.query('DELETE FROM campaign_events WHERE campaign_id=$1', [ids.campaign]);
  await pool.query('DELETE FROM placements WHERE id=$1', [ids.placement]);
  await pool.query('DELETE FROM campaigns WHERE id=$1', [ids.campaign]);
  await pool.query('DELETE FROM advertiser_accounts WHERE id=$1', [ids.account]);
  await pool.query('DELETE FROM advertisers WHERE organization_id=$1', [ids.org]);
  await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
  await pool.end();
});

describe('ads core schema', () => {
  it('keeps advertiser money in USD micro-units and enforces campaign budget', async () => {
    await pool.query('DELETE FROM campaign_events WHERE campaign_id=$1', [ids.campaign]);
    await pool.query('DELETE FROM placements WHERE id=$1', [ids.placement]);
    await pool.query('DELETE FROM campaigns WHERE id=$1', [ids.campaign]);
    await pool.query('DELETE FROM advertiser_accounts WHERE id=$1', [ids.account]);
    await pool.query('DELETE FROM advertisers WHERE organization_id=$1', [ids.org]);
    await pool.query("INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,'T050 Ads','t050-ads','ADVERTISER','ACTIVE')", [ids.org]);
    await pool.query('INSERT INTO advertisers(organization_id) VALUES ($1)', [ids.org]);
    await pool.query("INSERT INTO advertiser_accounts(id,organization_id,balance_micro) VALUES ($1,$2,1000000)", [ids.account, ids.org]);
    await pool.query("INSERT INTO campaigns(id,organization_id,account_id,name,budget_micro) VALUES ($1,$2,$3,'Campaign',1000)", [ids.campaign, ids.org, ids.account]);
    await expect(pool.query('UPDATE campaigns SET spent_micro=1001 WHERE id=$1', [ids.campaign])).rejects.toThrow('CAMPAIGN_BUDGET_EXCEEDED');
    await pool.query("INSERT INTO placements(id,placement_key,surface) VALUES ($1,'t050-placement','PWA')", [ids.placement]);
    const row = await pool.query('SELECT currency_code,budget_micro,spent_micro,sponsored_label FROM campaigns c JOIN advertiser_accounts a ON a.id=c.account_id WHERE c.id=$1', [ids.campaign]);
    expect(row.rows[0]).toEqual({ currency_code: 'USD', budget_micro: '1000', spent_micro: '0', sponsored_label: 'Sponsored' });
  });

  it('deduplicates delivery events by event key', async () => {
    await pool.query("INSERT INTO campaign_events(id,campaign_id,event_key,event_type,amount_micro) VALUES ('t050-event-1',$1,'t050-event-key','IMPRESSION',0)", [ids.campaign]);
    await expect(pool.query("INSERT INTO campaign_events(id,campaign_id,event_key,event_type) VALUES ('t050-event-2',$1,'t050-event-key','IMPRESSION')", [ids.campaign])).rejects.toThrow();
  });
});
