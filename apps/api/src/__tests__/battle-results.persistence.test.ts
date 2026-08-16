import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { PostgresBattleResultRepository } from '../infrastructure/adapters/postgres/PostgresBattleResultRepository.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const ids = { battle: 't082-result-battle', userA: 't082-result-a', userB: 't082-result-b' };

afterAll(async () => {
  await pool.query('DELETE FROM battle_results WHERE battle_id=$1', [ids.battle]);
  await pool.query('DELETE FROM battle_matches WHERE id=$1', [ids.battle]);
  await pool.query('DELETE FROM users WHERE id IN ($1,$2)', [ids.userA, ids.userB]);
  await pool.end();
});

describe('battle result persistence', () => {
  it('records one durable result per battle', async () => {
    await pool.query('DELETE FROM battle_results WHERE battle_id=$1', [ids.battle]);
    await pool.query('DELETE FROM battle_matches WHERE id=$1', [ids.battle]);
    await pool.query('DELETE FROM users WHERE id IN ($1,$2)', [ids.userA, ids.userB]);
    await pool.query("INSERT INTO users(id,email) VALUES ($1,$2),($3,$4)", [ids.userA, `${ids.userA}@test.local`, ids.userB, `${ids.userB}@test.local`]);
    await pool.query("INSERT INTO battle_matches(id,category,max_players,status) VALUES ($1,'coding',2,'COMPLETED')", [ids.battle]);
    const repository = new PostgresBattleResultRepository(pool);
    const input = { battleId: ids.battle, winnerUserId: ids.userA, scores: [{ userId: ids.userA, score: 10 }, { userId: ids.userB, score: 0 }], completedAt: new Date() };
    await expect(repository.record(input)).resolves.toBe('RECORDED');
    await expect(repository.record(input)).resolves.toBe('DUPLICATE');
  });
});
