import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const suffix = `t030_${Date.now()}`;
const ids = { user: `${suffix}_user`, org: `${suffix}_org`, client: `${suffix}_client`, key: `${suffix}_key`, usage: `${suffix}_usage` };

beforeAll(async () => {
  await pool.query('INSERT INTO users(id,email) VALUES ($1,$2)', [ids.user, `${ids.user}@test.local`]);
  await pool.query("INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,'T030 Org',$2,'DEVELOPER','ACTIVE')", [ids.org, `${suffix}_org`]);
  await pool.query('INSERT INTO api_clients(id,organization_id,name) VALUES ($1,$2,$3)', [ids.client, ids.org, 'test client']);
});

afterAll(async () => {
  await pool.query('DELETE FROM api_usage WHERE id=$1', [ids.usage]);
  await pool.query('DELETE FROM api_keys WHERE id=$1', [ids.key]);
  await pool.query('DELETE FROM api_clients WHERE id=$1', [ids.client]);
  await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
  await pool.end();
});

describe('developer API schema', () => {
  it('stores only a hash, prefix, scopes and integer usage units', async () => {
    await pool.query("INSERT INTO api_keys(id,client_id,key_hash,prefix,scopes_json) VALUES ($1,$2,$3,$4,$5)", [ids.key, ids.client, 'a'.repeat(64), 'rg_abc', JSON.stringify(['models.read'])]);
    await pool.query('INSERT INTO api_usage(id,client_id,key_id,model,input_tokens,output_tokens,credits,cost_microusd) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [ids.usage, ids.client, ids.key, 'gpt-5.6-luna', 3, 5, 20, 14]);
    const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='api_keys'");
    const usage = await pool.query('SELECT credits,cost_microusd FROM api_usage WHERE id=$1', [ids.usage]);
    expect(columns.rows.map((row) => row.column_name)).not.toContain('raw_key');
    expect(usage.rows[0]).toMatchObject({ credits: '20', cost_microusd: '14' });
  });

  it('rejects short hashes and negative accounting units', async () => {
    await expect(pool.query("INSERT INTO api_keys(id,client_id,key_hash,prefix) VALUES ($1,$2,'short','rg_bad')", [`${ids.key}_bad`, ids.client])).rejects.toThrow();
    await expect(pool.query('INSERT INTO api_usage(id,client_id,key_id,model,credits) VALUES ($1,$2,$3,$4,-1)', [`${ids.usage}_bad`, ids.client, ids.key, 'model'])).rejects.toThrow();
  });
});
