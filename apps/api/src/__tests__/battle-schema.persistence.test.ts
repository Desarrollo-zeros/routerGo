import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const ids = { battle: 't080-battle', userA: 't080-user-a', userB: 't080-user-b' };

afterAll(async () => {
  await pool.query('DELETE FROM battle_matches WHERE id=$1', [ids.battle]);
  await pool.query('DELETE FROM users WHERE id IN ($1,$2)', [ids.userA, ids.userB]);
  await pool.end();
});

describe('battle schema', () => {
  it('enforces server-owned score and one answer per player and round', async () => {
    await pool.query('DELETE FROM battle_matches WHERE id=$1', [ids.battle]);
    await pool.query('DELETE FROM users WHERE id IN ($1,$2)', [ids.userA, ids.userB]);
    await pool.query("INSERT INTO users(id,email) VALUES ($1,$2),($3,$4)", [ids.userA, `${ids.userA}@test.local`, ids.userB, `${ids.userB}@test.local`]);
    await pool.query("INSERT INTO battle_matches(id,category,max_players,status) VALUES ($1,'coding',2,'ACTIVE')", [ids.battle]);
    await pool.query('INSERT INTO battle_players(battle_id,user_id) VALUES ($1,$2),($1,$3)', [ids.battle, ids.userA, ids.userB]);
    await pool.query("INSERT INTO battle_rounds(battle_id,round_number,prompt_key,answer_hash,points,starts_at,ends_at) VALUES ($1,1,'quiz-1','hash',10,now(),now()+interval '30 seconds')", [ids.battle]);
    await pool.query("INSERT INTO battle_answers(battle_id,round_number,user_id,answer_hash,is_correct,points) VALUES ($1,1,$2,'answer',true,10)", [ids.battle, ids.userA]);
    await expect(pool.query("INSERT INTO battle_answers(battle_id,round_number,user_id,answer_hash,is_correct,points) VALUES ($1,1,$2,'answer-2',true,10)", [ids.battle, ids.userA])).rejects.toThrow();
    await expect(pool.query("INSERT INTO battle_matches(id,category,max_players) VALUES ('t080-invalid','coding',1)")).rejects.toThrow();
  });
});
