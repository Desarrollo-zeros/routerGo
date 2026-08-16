import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildCompositionApp, createComposition } from '../composition-root/composition.js';

const suffix = `t042-${Date.now()}`;
const rawKey = `rg_${suffix}_operator_key`;
const ids = { org: `${suffix}-org`, user: `${suffix}-user`, wallet: `${suffix}-wallet`, member: `${suffix}-member`, client: `${suffix}-client`, key: `${suffix}-key` };
const compositionPromise = createComposition();
const appPromise = compositionPromise.then(buildCompositionApp);

beforeAll(async () => {
  const { pool } = await compositionPromise;
  await pool.query("INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,'T042 Org',$2,'INTERNAL','ACTIVE')", [ids.org, `${suffix}-slug`]);
  await pool.query("INSERT INTO users(id,email,status) VALUES ($1,$2,'ACTIVE')", [ids.user, `${suffix}@routergo.test`]);
  await pool.query('INSERT INTO wallets(id,user_id,balance) VALUES ($1,$2,0)', [ids.wallet, ids.user]);
  await pool.query("INSERT INTO organization_members(id,organization_id,user_id,status) VALUES ($1,$2,$3,'ACTIVE')", [ids.member, ids.org, ids.user]);
  await pool.query("INSERT INTO api_clients(id,organization_id,name,status) VALUES ($1,$2,'T042 client','ACTIVE')", [ids.client, ids.org]);
  await pool.query("INSERT INTO api_keys(id,client_id,key_hash,prefix,scopes_json,status) VALUES ($1,$2,$3,$4,$5,'ACTIVE')", [ids.key, ids.client, hash(rawKey), rawKey.slice(0, 8), JSON.stringify(['runtime.publish', 'runtime.rollback'])]);
  await pool.query('INSERT INTO member_roles(member_id,role_id) VALUES ($1,$2)', [ids.member, 'role-operator']);
});

afterAll(async () => {
  const composition = await compositionPromise;
  await (await appPromise).close();
  await composition.redis.quit();
  await composition.pool.end();
});

describe.sequential('T042 admin runtime HTTP boundary', () => {
  it('publishes and rolls back through API-key authentication plus RBAC', async () => {
    const app = await appPromise;
    const publish = await app.inject({ method: 'POST', url: '/admin/runtime/publish', headers: headers('publish') });
    expect(publish.statusCode).toBe(200);
    const publishedVersion = publish.json().version;

    const rollback = await app.inject({ method: 'POST', url: '/admin/runtime/rollback', headers: headers('rollback'), payload: { targetVersion: publishedVersion - 1 } });
    expect(rollback.statusCode).toBe(200);
    expect(rollback.json().version).toBe(publishedVersion - 1);
  });

  it('denies the same transport when the membership loses its grant', async () => {
    const composition = await compositionPromise;
    await composition.pool.query('DELETE FROM member_roles WHERE member_id=$1', [ids.member]);
    const response = await (await appPromise).inject({ method: 'POST', url: '/admin/runtime/publish', headers: headers('denied') });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: 'forbidden', reason: 'MISSING_PERMISSION' });
  });
});

function headers(operation: string): Record<string, string> {
  return { authorization: `Bearer ${rawKey}`, 'idempotency-key': `${suffix}-${operation}` };
}

function hash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
