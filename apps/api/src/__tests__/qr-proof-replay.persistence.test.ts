import Redis from 'ioredis';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { RedisQrProofReplayStore } from '../infrastructure/adapters/redis/RedisQrProofReplayStore.js';

const redis = new Redis(process.env.ROUTERGO_REDIS_URL ?? 'redis://localhost:6380');
const store = new RedisQrProofReplayStore(redis);

beforeEach(async () => { await redis.del('treasure:qr:replay:t092-nonce'); });
afterAll(async () => { await redis.quit(); });

describe('RedisQrProofReplayStore', () => {
  it('claims a nonce once and rejects the replay', async () => {
    const expiry = new Date(Date.now() + 60_000);
    await expect(store.claim('t092-nonce', expiry)).resolves.toBe(true);
    await expect(store.claim('t092-nonce', expiry)).resolves.toBe(false);
  });

  it('rejects an expired nonce without writing it', async () => {
    await expect(store.claim('t092-expired', new Date(Date.now() - 1))).resolves.toBe(false);
  });
});
