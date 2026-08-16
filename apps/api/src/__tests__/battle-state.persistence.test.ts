import Redis from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';
import { RedisBattleStateStore } from '../infrastructure/adapters/redis/RedisBattleStateStore.js';

const redis = new Redis(process.env.ROUTERGO_REDIS_URL ?? 'redis://localhost:6380');
const store = new RedisBattleStateStore(redis);

afterAll(async () => {
  await store.remove('t082-state');
  await store.remove('t081-matchmaking');
  await redis.quit();
});

describe('battle state store', () => {
  it('round-trips ephemeral state and removes it explicitly', async () => {
    const state = { id: 't082-state', category: 'coding', status: 'ACTIVE' as const, players: [{ userId: 'user-a', score: 10 }], currentRound: 1 };
    await store.save(state, 30);
    await expect(store.read(state.id)).resolves.toEqual(state);
    await store.remove(state.id);
    await expect(store.read(state.id)).resolves.toBeNull();
  });

  it('rejects an unbounded or invalid TTL', async () => {
    const state = { id: 't082-state', category: 'coding', status: 'WAITING' as const, players: [], currentRound: 0 };
    await expect(store.save(state, 0)).rejects.toThrow('BATTLE_STATE_TTL_INVALID');
  });

  it('creates bounded matchmaking state and joins atomically', async () => {
    const battleId = 't081-matchmaking';
    await store.remove(battleId);
    await expect(store.create({ id: battleId, category: 'coding', maxPlayers: 2 })).resolves.toMatchObject({ maxPlayers: 2 });
    const joined = await Promise.all([store.join(battleId, 'user-a'), store.join(battleId, 'user-b')]);
    expect(joined).toHaveLength(2);
    expect(new Set(joined.flatMap((state) => state.players.map((player) => player.userId)))).toEqual(new Set(['user-a', 'user-b']));
    await expect(store.join(battleId, 'user-c')).rejects.toThrow('BATTLE_NOT_JOINABLE');
    await expect(store.join(battleId, 'user-a')).resolves.toMatchObject({ players: expect.arrayContaining([{ userId: 'user-a', score: 0 }, { userId: 'user-b', score: 0 }]) });
    await store.remove(battleId);
  });
});
