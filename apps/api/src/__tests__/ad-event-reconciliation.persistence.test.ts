import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PostgresAdEventRepository } from '../infrastructure/adapters/postgres/PostgresAdEventRepository.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo_t035' });
const ids = { org: 't053-org', account: 't053-account', campaign: 't053-campaign', placement: 't053-placement' };

beforeAll(async () => {
  await pool.query('INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,\'T053\',\'t053\',\'ADVERTISER\',\'ACTIVE\') ON CONFLICT DO NOTHING', [ids.org]);
  await pool.query('INSERT INTO advertisers(organization_id) VALUES ($1) ON CONFLICT DO NOTHING', [ids.org]);
  await pool.query('INSERT INTO advertiser_accounts(id,organization_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ids.account, ids.org]);
  await pool.query('INSERT INTO campaigns(id,organization_id,account_id,name,status,moderation_status,budget_micro) VALUES ($1,$2,$3,\'T053\',\'ACTIVE\',\'APPROVED\',10) ON CONFLICT DO NOTHING', [ids.campaign, ids.org, ids.account]);
  await pool.query('INSERT INTO placements(id,placement_key,surface) VALUES ($1,\'t053\',\'PWA\') ON CONFLICT DO NOTHING', [ids.placement]);
});

afterAll(async () => {
  await pool.query('DELETE FROM campaign_events WHERE campaign_id=$1', [ids.campaign]);
  await pool.query('DELETE FROM campaigns WHERE id=$1', [ids.campaign]);
  await pool.query('DELETE FROM placements WHERE id=$1', [ids.placement]);
  await pool.query('DELETE FROM advertiser_accounts WHERE id=$1', [ids.account]);
  await pool.query('DELETE FROM advertisers WHERE organization_id=$1', [ids.org]);
  await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
  await pool.end();
});

describe('Postgres ad event reconciliation', () => {
  it('records delivery once and charges campaign spend once', async () => {
    const repository = new PostgresAdEventRepository(pool);
    const event = { id: 't053-event', campaignId: ids.campaign, placementId: ids.placement, eventKey: 't053-key', eventType: 'CLICK' as const, amountMicro: 3n };
    await expect(repository.recordCampaignEvent(event)).resolves.toBe('RECORDED');
    await expect(repository.recordCampaignEvent({ ...event, id: 't053-event-retry' })).resolves.toBe('DUPLICATE');
    const result = await pool.query('SELECT spent_micro FROM campaigns WHERE id=$1', [ids.campaign]);
    expect(result.rows[0].spent_micro).toBe('3');
  });
});
