import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Redis from 'ioredis';
import pg from 'pg';
import { ApiQuotaPostgresRepository } from '../infrastructure/adapters/postgres/ApiQuotaPostgresRepository';
import { RedisApiQuotaCounter } from '../infrastructure/adapters/redis/RedisApiQuotaCounter';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380');
const suffix = `t032_${Date.now()}`;
const ids = { client: `${suffix}_client`, key: `${suffix}_key`, policy: `${suffix}_policy`, modelPolicy: `${suffix}_model` };

beforeAll(async () => {
  await pool.query(`INSERT INTO api_quota_policies(id,scope_type,scope_id,requests_per_minute,tokens_per_minute,credits_per_minute) VALUES ($1,'CLIENT',$2,2,5,10)`, [ids.policy, ids.client]);
  await pool.query(`INSERT INTO api_quota_policies(id,scope_type,scope_id,model_pattern,requests_per_minute) VALUES ($1,'KEY',$2,'model-a',3)`, [ids.modelPolicy, ids.key]);
});

afterAll(async () => {
  await clearQuotaKeys();
  await pool.query('DELETE FROM api_quota_policies WHERE id IN ($1,$2)', [ids.policy, ids.modelPolicy]);
  await redis.quit();
  await pool.end();
});

describe('layered API quotas', () => {
  beforeEach(async () => {
    await clearQuotaKeys();
  });

  it('loads durable client/key policy and atomically enforces tokens', async () => {
    const policies = new ApiQuotaPostgresRepository(pool);
    const counter = new RedisApiQuotaCounter(redis);
    const loaded = await policies.findEnabled({ clientId: ids.client, keyId: ids.key, model: 'model-a' });
    expect(loaded).toHaveLength(2);
    await expect(counter.consume(loaded, { requests: 1, tokens: 3, credits: 2n })).resolves.toMatchObject({ allowed: true, reason: 'ALLOWED' });
    await expect(counter.consume(loaded, { requests: 1, tokens: 3, credits: 2n })).resolves.toMatchObject({ allowed: false, reason: 'TOKENS_EXCEEDED' });
  });

  it('rejects request and credit dimensions independently', async () => {
    const counter = new RedisApiQuotaCounter(redis);
    const policy = { id: ids.policy, scopeType: 'CLIENT' as const, scopeId: ids.client, modelPattern: null, requestsPerMinute: 1, tokensPerMinute: null, creditsPerMinute: 1n };
    await expect(counter.consume([policy], { requests: 1, tokens: 0, credits: 1n })).resolves.toMatchObject({ allowed: true });
    await expect(counter.consume([policy], { requests: 1, tokens: 0, credits: 0n })).resolves.toMatchObject({ allowed: false, reason: 'REQUESTS_EXCEEDED' });
  });
});

async function clearQuotaKeys(): Promise<void> {
  await redis.del(...quotaKeys('CLIENT', ids.client, '*'), ...quotaKeys('KEY', ids.key, 'model-a'));
}

function quotaKeys(scope: string, id: string, model: string): string[] {
  return ['requests', 'tokens', 'credits'].map((dimension) => `api-quota:${scope}:${id}:${model}:${dimension}`);
}
