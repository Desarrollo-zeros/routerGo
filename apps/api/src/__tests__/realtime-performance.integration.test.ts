import Redis from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';
import { evaluatePerformance } from '../domain/performance/PerformanceBudget.js';
import { RedisBattleStateStore } from '../infrastructure/adapters/redis/RedisBattleStateStore.js';

const redis = new Redis(process.env.ROUTERGO_REDIS_URL ?? 'redis://localhost:6380');
const store = new RedisBattleStateStore(redis);
const battleIds = Array.from({ length: 40 }, (_, index) => `t103-load-${index}`);

afterAll(async () => {
  await Promise.all(battleIds.map((id) => store.remove(id)));
  await redis.quit();
});

describe('realtime matchmaking performance budget', () => {
  it('keeps concurrent Redis matchmaking transitions within the local smoke budget', async () => {
    const samples: number[] = [];
    let errors = 0;
    for (const battleId of battleIds) {
      const start = performance.now();
      try {
        await store.create({ id: battleId, category: 'coding', maxPlayers: 2 });
        await Promise.all([store.join(battleId, `user-a-${battleId}`), store.join(battleId, `user-b-${battleId}`)]);
      } catch {
        errors += 1;
      }
      samples.push(performance.now() - start);
    }
    expect(evaluatePerformance(samples, errors, { p95Ms: 500, maxErrorRate: 0 })).toMatchObject({ passed: true });
  });
});
