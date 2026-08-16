import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const ids = { user: 't100-user', event: 't100-event', case: 't100-case' };

afterAll(async () => {
  await pool.query('DELETE FROM review_cases WHERE id=$1', [ids.case]);
  await pool.query('DELETE FROM risk_scores WHERE subject_user_id=$1', [ids.user]);
  await pool.query('DELETE FROM risk_events WHERE id=$1', [ids.event]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
  await pool.end();
});

describe('risk schema', () => {
  it('keeps risk events idempotent and links score and review case to a user', async () => {
    await pool.query('DELETE FROM review_cases WHERE id=$1', [ids.case]);
    await pool.query('DELETE FROM risk_scores WHERE subject_user_id=$1', [ids.user]);
    await pool.query('DELETE FROM risk_events WHERE id=$1', [ids.event]);
    await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
    await pool.query("INSERT INTO users(id,email) VALUES ($1,$2)", [ids.user, `${ids.user}@test.local`]);
    await pool.query("INSERT INTO risk_events(id,subject_user_id,category,event_key,severity,signal_json) VALUES ($1,$2,'BATTLE','t100-key',40,'{\"replay\":true}')", [ids.event, ids.user]);
    await pool.query("INSERT INTO risk_scores(subject_user_id,score,action,policy_version) VALUES ($1,80,'BLOCKED','t100')", [ids.user]);
    await pool.query("INSERT INTO review_cases(id,subject_user_id,risk_event_id,reason) VALUES ($1,$2,$3,'Replay signal')", [ids.case, ids.user, ids.event]);
    await expect(pool.query("INSERT INTO risk_events(id,subject_user_id,category,event_key,severity) VALUES ('t100-event-2',$1,'BATTLE','t100-key',40)", [ids.user])).rejects.toThrow();
    await expect(pool.query("INSERT INTO risk_scores(subject_user_id,score,action,policy_version) VALUES ('t100-user-2',101,'BLOCKED','t100')")).rejects.toThrow();
  });
});
