import pg from 'pg';
import Redis from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';
import { BattleMatch } from '../domain/battle/BattleMatch.js';
import { EvaluateChallengeReward } from '../application/use-cases/EvaluateChallengeReward.js';
import { PostgresBattleResultRepository } from '../infrastructure/adapters/postgres/PostgresBattleResultRepository.js';
import { RedisBattleStateStore } from '../infrastructure/adapters/redis/RedisBattleStateStore.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const redis = new Redis(process.env.ROUTERGO_REDIS_URL ?? 'redis://localhost:6380');
const store = new RedisBattleStateStore(redis);
const battleId = 't083-resilience-battle';
const users = ['t083-resilience-a', 't083-resilience-b'];

afterAll(async () => {
  await store.remove('t083-reconnect');
  await pool.query('DELETE FROM battle_results WHERE battle_id=$1', [battleId]);
  await pool.query('DELETE FROM battle_matches WHERE id=$1', [battleId]);
  await pool.query('DELETE FROM users WHERE id = ANY($1::text[])', [users]);
  await pool.end();
  await redis.quit();
});

describe('battle resilience boundaries', () => {
  it('reconnects to an existing ephemeral match by battle id', async () => {
    await store.remove('t083-reconnect');
    await store.create({ id: 't083-reconnect', category: 'coding', maxPlayers: 2 });
    await store.join('t083-reconnect', users[0]);
    const reconnected = new RedisBattleStateStore(redis);
    await expect(reconnected.read('t083-reconnect')).resolves.toMatchObject({ id: 't083-reconnect', players: [{ userId: users[0], score: 0 }] });
  });

  it('rejects answers after the authoritative round timeout', () => {
    const start = new Date('2026-08-16T12:00:00Z');
    const battle = BattleMatch.create('t083-timeout', 'coding', 2, start);
    battle.join(users[0], start);
    battle.join(users[1], start);
    battle.start();
    battle.openRound({ number: 1, promptKey: 'q1', expectedAnswer: 'RouterGo', points: 10, startsAt: start, endsAt: new Date(start.getTime() + 1000) });
    expect(() => battle.submitAnswer(users[0], 1, 'RouterGo', new Date(start.getTime() + 1001))).toThrow('BATTLE_ROUND_EXPIRED');
  });

  it('records one result when completion is retried concurrently', async () => {
    await pool.query('DELETE FROM battle_results WHERE battle_id=$1', [battleId]);
    await pool.query('DELETE FROM battle_matches WHERE id=$1', [battleId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::text[])', [users]);
    await pool.query('INSERT INTO users(id,email) VALUES ($1,$2),($3,$4)', [users[0], `${users[0]}@test.local`, users[1], `${users[1]}@test.local`]);
    await pool.query("INSERT INTO battle_matches(id,category,max_players,status) VALUES ($1,'coding',2,'COMPLETED')", [battleId]);
    const input = { battleId, winnerUserId: users[0], scores: [{ userId: users[0], score: 10 }, { userId: users[1], score: 0 }], completedAt: new Date() };
    const writes = await Promise.all([new PostgresBattleResultRepository(pool).record(input), new PostgresBattleResultRepository(pool).record(input)]);
    expect(writes.sort()).toEqual(['DUPLICATE', 'RECORDED']);
  });

  it('keeps reward eligibility bounded by policy and budget', async () => {
    const reward = new EvaluateChallengeReward({ evaluate: async () => ({ allowed: true, remainingCredits: undefined }) });
    await expect(reward.execute({ requestedCredits: 10n, challengeCapCredits: 20n, todayEarnedCredits: 0n, dailyCapCredits: 15n })).resolves.toMatchObject({ eligible: true, credits: { value: 10n } });
    await expect(reward.execute({ requestedCredits: 10n, challengeCapCredits: 20n, todayEarnedCredits: 15n, dailyCapCredits: 15n })).resolves.toMatchObject({ eligible: false, reason: 'DAILY_CAP_REACHED' });
  });
});
