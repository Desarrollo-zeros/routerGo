import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { nanoid } from 'nanoid';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const suffix = nanoid(8);
const ids = {
  user: `t020-user-${suffix}`,
  wallet: `t020-wallet-${suffix}`,
  gateway: `t020-gateway-${suffix}`,
};

beforeAll(async () => {
  await pool.query('INSERT INTO users(id,email) VALUES ($1,$2)', [ids.user, `${ids.user}@test.local`]);
  await pool.query('INSERT INTO wallets(id,user_id,balance) VALUES ($1,$2,500)', [ids.wallet, ids.user]);
  await pool.query(
    `INSERT INTO provider_gateways(id,key,display_name,kind,auth_scheme)
     VALUES ($1,$2,'T020 gateway','GO','bearer')`,
    [ids.gateway, ids.gateway],
  );
});

afterAll(async () => {
  await pool.query("DELETE FROM provider_cost_entries WHERE operation_id LIKE 't020-%'");
  await pool.query("DELETE FROM revenue_entries WHERE operation_id LIKE 't020-%'");
  await pool.query("DELETE FROM credit_reservations WHERE operation_id LIKE 't020-%'");
  await pool.query("DELETE FROM economy_budgets WHERE id LIKE 't020-%'");
  await pool.query('DELETE FROM provider_gateways WHERE id=$1', [ids.gateway]);
  await pool.query('DELETE FROM wallets WHERE id=$1', [ids.wallet]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
  await pool.end();
});

describe.sequential('T020 economy persistence', () => {
  it('preserves the existing wallet schema and accepts a positive reservation', async () => {
    const operationId = `t020-reservation-${suffix}`;
    const result = await pool.query<{ reserved_credits: string }>(
      `INSERT INTO credit_reservations(id,wallet_id,operation_id,reserved_credits,status)
       VALUES ($1,$2,$3,25,'RESERVED') RETURNING reserved_credits`,
      [`${operationId}-id`, ids.wallet, operationId],
    );
    const wallet = await pool.query<{ balance: string }>('SELECT balance FROM wallets WHERE id=$1', [ids.wallet]);
    expect(result.rows[0].reserved_credits).toBe('25');
    expect(wallet.rows[0].balance).toBe('500');
  });

  it('rejects invalid reservation amounts and duplicate operations', async () => {
    await expect(pool.query(
      `INSERT INTO credit_reservations(id,wallet_id,operation_id,reserved_credits,status)
       VALUES ($1,$2,$3,0,'RESERVED')`,
      ['t020-zero', ids.wallet, 't020-zero-op'],
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO credit_reservations(id,wallet_id,operation_id,reserved_credits,status)
       VALUES ($1,$2,$3,-1,'RESERVED')`,
      ['t020-negative', ids.wallet, 't020-negative-op'],
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO credit_reservations(id,wallet_id,operation_id,reserved_credits,settled_credits,status)
       VALUES ($1,$2,'t020-reservation-${suffix}',25,26,'RESERVED')`,
      ['t020-over-settled', ids.wallet],
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO credit_reservations(id,wallet_id,operation_id,reserved_credits,settled_credits,released_credits,status)
       VALUES ($1,$2,'t020-reservation-${suffix}-released',25,10,20,'RESERVED')`,
      ['t020-over-released', ids.wallet],
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO credit_reservations(id,wallet_id,operation_id,reserved_credits,status)
       VALUES ($1,$2,$3,10,'RESERVED')`,
      ['t020-duplicate-id', ids.wallet, `t020-reservation-${suffix}`],
    )).rejects.toThrow();
  });

  it('stores explicit finite budgets and rejects invalid periods or scopes', async () => {
    const start = '2030-01-01T00:00:00Z';
    const end = '2030-02-01T00:00:00Z';
    await pool.query(
      `INSERT INTO economy_budgets(id,scope_type,amount_unit,limit_amount,starts_at,ends_at)
       VALUES ($1,'GLOBAL','CREDITS',1000,$2,$3)`,
      [`t020-budget-${suffix}`, start, end],
    );
    await expect(pool.query(
      `INSERT INTO economy_budgets(id,scope_type,amount_unit,limit_amount,starts_at,ends_at)
       VALUES ('t020-invalid-period','GLOBAL','CREDITS',1000,$1,$2)`,
      [end, start],
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO economy_budgets(id,scope_type,scope_id,amount_unit,limit_amount,starts_at,ends_at)
       VALUES ('t020-invalid-global','GLOBAL','provider','USD_MICRO',1000,$1,$2)`,
      [start, end],
    )).rejects.toThrow();
  });

  it('keeps provider cost tokens separate from fixed-precision money', async () => {
    const operationId = `t020-cost-${suffix}`;
    await pool.query(
      `INSERT INTO provider_cost_entries(id,operation_id,provider_gateway_id,input_tokens,output_tokens,cost_microusd,pricing_version,source)
       VALUES ($1,$2,$3,10,4,125,'pricing-v1','UPSTREAM_RESULT')`,
      [`${operationId}-id`, operationId, ids.gateway],
    );
    await expect(pool.query(
      `INSERT INTO provider_cost_entries(id,operation_id,provider_gateway_id,cost_microusd,pricing_version,source)
       VALUES ('t020-cost-duplicate',$1,$2,125,'pricing-v1','UPSTREAM_RESULT')`,
      [operationId, ids.gateway],
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO provider_cost_entries(id,operation_id,provider_gateway_id,cost_microusd,pricing_version,source)
       VALUES ('t020-cost-negative','t020-cost-negative-op',$1,-1,'pricing-v1','UPSTREAM_RESULT')`,
      [ids.gateway],
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO provider_cost_entries(id,operation_id,provider_gateway_id,cost_microusd,pricing_version,source)
       VALUES ('t020-cost-invalid-fk','t020-cost-invalid-fk-op','missing-gateway',1,'pricing-v1','UPSTREAM_RESULT')`,
    )).rejects.toThrow();
  });

  it('distinguishes pending and finalized revenue and rejects invalid money', async () => {
    await pool.query(
      `INSERT INTO revenue_entries(id,operation_id,source_type,gross_revenue_microusd,net_revenue_microusd,status,occurred_at)
       VALUES ('t020-revenue-pending','t020-revenue-pending-op','OTHER',100,90,'PENDING',now())`,
    );
    await pool.query(
      `INSERT INTO revenue_entries(id,operation_id,source_type,gross_revenue_microusd,net_revenue_microusd,status,occurred_at,finalized_at)
       VALUES ('t020-revenue-finalized','t020-revenue-finalized-op','OTHER',200,180,'FINALIZED',now(),now())`,
    );
    await expect(pool.query(
      `INSERT INTO revenue_entries(id,operation_id,source_type,gross_revenue_microusd,net_revenue_microusd,status,occurred_at)
       VALUES ('t020-revenue-negative','t020-revenue-negative-op','OTHER',-1,0,'PENDING',now())`,
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO revenue_entries(id,operation_id,source_type,gross_revenue_microusd,net_revenue_microusd,status,occurred_at)
       VALUES ('t020-revenue-invalid-status','t020-revenue-invalid-status-op','OTHER',1,1,'ESTIMATED',now())`,
    )).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO revenue_entries(id,operation_id,source_type,gross_revenue_microusd,net_revenue_microusd,status,occurred_at)
       VALUES ('t020-revenue-duplicate','t020-revenue-pending-op','OTHER',100,90,'PENDING',now())`,
    )).rejects.toThrow();
  });

  it('does not cascade-delete wallets or provider cost history', async () => {
    await expect(pool.query('DELETE FROM wallets WHERE id=$1', [ids.wallet])).rejects.toThrow();
    await expect(pool.query('DELETE FROM provider_gateways WHERE id=$1', [ids.gateway])).rejects.toThrow();
    const reservation = await pool.query('SELECT id FROM credit_reservations WHERE operation_id LIKE $1', ['t020-%']);
    const costs = await pool.query('SELECT id FROM provider_cost_entries WHERE operation_id LIKE $1', ['t020-%']);
    expect(reservation.rowCount).toBeGreaterThan(0);
    expect(costs.rowCount).toBeGreaterThan(0);
  });
});
