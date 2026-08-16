import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { ApiKeyPostgresRepository } from '../infrastructure/adapters/postgres/ApiKeyPostgresRepository';
import { Sha256ApiKeyHasher } from '../infrastructure/security/Sha256ApiKeyHasher';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const suffix = `t031_${Date.now()}`;
const ids = { org: `${suffix}_org`, client: `${suffix}_client`, key: `${suffix}_key` };

beforeAll(async () => {
  await pool.query("INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,'T031 Org',$2,'DEVELOPER','ACTIVE')", [ids.org, `${suffix}_org`]);
  await pool.query('INSERT INTO api_clients(id,organization_id,name) VALUES ($1,$2,$3)', [ids.client, ids.org, 'test client']);
});

afterAll(async () => {
  await pool.query('DELETE FROM api_keys WHERE id=$1', [ids.key]);
  await pool.query('DELETE FROM api_clients WHERE id=$1', [ids.client]);
  await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
  await pool.end();
});

describe('API key PostgreSQL repository', () => {
  it('round-trips a hash and scoped metadata without raw key storage', async () => {
    const repository = new ApiKeyPostgresRepository(pool);
    const hasher = new Sha256ApiKeyHasher();
    const rawKey = 'rg_live_persistence_only';
    await repository.insert({ id: ids.key, clientId: ids.client, keyHash: hasher.hash(rawKey), prefix: rawKey.slice(0, 12), scopes: ['models.read'], status: 'ACTIVE', expiresAt: null });
    await expect(repository.findByHash(hasher.hash(rawKey))).resolves.toMatchObject({ id: ids.key, clientId: ids.client, scopes: ['models.read'], status: 'ACTIVE' });
    const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='api_keys'");
    expect(columns.rows.map((row) => row.column_name)).not.toContain('raw_key');
  });

  it('persists revocation and last-use timestamps', async () => {
    const repository = new ApiKeyPostgresRepository(pool);
    const revokedAt = new Date('2030-01-01T00:00:00Z');
    await repository.touchLastUsed(ids.key, revokedAt);
    await repository.revoke(ids.key, revokedAt);
    await expect(repository.findById(ids.key)).resolves.toMatchObject({ id: ids.key, status: 'REVOKED' });
    const row = await pool.query('SELECT last_used_at,revoked_at FROM api_keys WHERE id=$1', [ids.key]);
    expect(row.rows[0].last_used_at).toEqual(revokedAt);
    expect(row.rows[0].revoked_at).toEqual(revokedAt);
  });
});
