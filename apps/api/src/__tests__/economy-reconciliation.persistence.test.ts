import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PostgresEconomyReconciliationRepository } from '../infrastructure/adapters/postgres/PostgresEconomyReconciliationRepository';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const suffix = `t026_${Date.now()}`;
const ids = { user: `${suffix}_user`, wallet: `${suffix}_wallet`, quote: `${suffix}_quote`, run: `${suffix}_run`, ad: `${suffix}_ad` };

beforeAll(async () => {
  await pool.query('INSERT INTO users(id,email) VALUES ($1,$2)', [ids.user, `${ids.user}@test.local`]);
  await pool.query('INSERT INTO wallets(id,user_id,balance,version) VALUES ($1,$2,0,0)', [ids.wallet, ids.user]);
  await pool.query(`INSERT INTO chat_quotes(id,user_id,logical_model_id,credit_cost,max_output_tokens,request_hash,pricing_version,created_at,expires_at) VALUES ($1,$2,'gpt-5.6-luna',1,64,$3,'t026-test',now(),now()+interval '1 hour')`, [ids.quote, ids.user, `${suffix}_quote_key`]);
  await pool.query(`INSERT INTO chat_runs(id,quote_id,user_id,logical_model_id,status,charged_credits,idempotency_key,created_at,provider_request_id,provider_cost_microusd,input_tokens,output_tokens,economy_status) VALUES ($1,$2,$3,'gpt-5.6-luna','COMPLETED',1,$4,now(),'${suffix}_request',37,4,8,'SETTLED')`, [ids.run, ids.quote, ids.user, `${suffix}_run_key`]);
  await pool.query(`INSERT INTO ad_events(id,placement,status,finalized_revenue_micro,occurred_at) VALUES ($1,'home','FINALIZED',55,now())`, [ids.ad]);
});

afterAll(async () => {
  await pool.query('DELETE FROM provider_cost_entries WHERE run_id=$1', [ids.run]);
  await pool.query('DELETE FROM revenue_entries WHERE ad_event_id=$1', [ids.ad]);
  await pool.query('DELETE FROM ad_events WHERE id=$1', [ids.ad]);
  await pool.query('DELETE FROM chat_runs WHERE id=$1', [ids.run]);
  await pool.query('DELETE FROM chat_quotes WHERE id=$1', [ids.quote]);
  await pool.query('DELETE FROM wallets WHERE id=$1', [ids.wallet]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
  await pool.end();
});

describe('Postgres economy reconciliation', () => {
  it('materializes provider cost and finalized revenue exactly once', async () => {
    const repository = new PostgresEconomyReconciliationRepository(pool);
    await expect(repository.reconcileProviderCosts(10)).resolves.toBe(1);
    await expect(repository.reconcileFinalizedRevenue(10)).resolves.toBe(1);
    await expect(repository.reconcileProviderCosts(10)).resolves.toBe(0);
    await expect(repository.reconcileFinalizedRevenue(10)).resolves.toBe(0);
    const cost = await pool.query('SELECT cost_microusd,pricing_version FROM provider_cost_entries WHERE run_id=$1', [ids.run]);
    const revenue = await pool.query('SELECT net_revenue_microusd,status FROM revenue_entries WHERE ad_event_id=$1', [ids.ad]);
    expect(cost.rows[0]).toMatchObject({ cost_microusd: '37', pricing_version: 't026-test' });
    expect(revenue.rows[0]).toMatchObject({ net_revenue_microusd: '55', status: 'FINALIZED' });
  });

  it('counts runs requiring reconciliation without mutating them', async () => {
    const repository = new PostgresEconomyReconciliationRepository(pool);
    await pool.query("UPDATE chat_runs SET economy_status='RECONCILIATION_REQUIRED' WHERE id=$1", [ids.run]);
    await expect(repository.countReconciliationRequiredRuns()).resolves.toBeGreaterThan(0);
  });
});
