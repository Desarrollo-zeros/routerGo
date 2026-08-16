import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo_t035' });
const ids = { challenge: 't060-challenge', version: 't060-version', rule: 't060-rule' };

beforeAll(async () => {
  await pool.query(`INSERT INTO challenge_definitions(id,challenge_key,challenge_type,verification_strategy) VALUES ($1,'t060','QUIZ','typed.quiz') ON CONFLICT DO NOTHING`, [ids.challenge]);
  await pool.query(`INSERT INTO challenge_versions(id,challenge_id,version,content_json,reward_policy_json) VALUES ($1,$2,1,'{"prompt":"test"}','{"policy":"bounded"}') ON CONFLICT DO NOTHING`, [ids.version, ids.challenge]);
});

afterAll(async () => {
  await pool.query('DELETE FROM challenge_reward_rules WHERE challenge_version_id=$1', [ids.version]);
  await pool.query('DELETE FROM challenge_versions WHERE id=$1', [ids.version]);
  await pool.query('DELETE FROM challenge_definitions WHERE id=$1', [ids.challenge]);
  await pool.end();
});

describe('versioned challenge schema', () => {
  it('keeps versions unique and reward rules bounded', async () => {
    await pool.query('INSERT INTO challenge_reward_rules(id,challenge_version_id,policy_json,max_reward_credits) VALUES ($1,$2,$3,$4)', [ids.rule, ids.version, { cap: 'daily' }, 25]);
    await expect(pool.query(`INSERT INTO challenge_versions(id,challenge_id,version,content_json,reward_policy_json) VALUES ('t060-duplicate',$1,1,'{}','{}')`, [ids.challenge])).rejects.toMatchObject({ code: '23505' });
    const result = await pool.query('SELECT version,max_reward_credits FROM challenge_versions v JOIN challenge_reward_rules r ON r.challenge_version_id=v.id WHERE v.id=$1', [ids.version]);
    expect(result.rows[0]).toMatchObject({ version: 1, max_reward_credits: '25' });
  });
});
