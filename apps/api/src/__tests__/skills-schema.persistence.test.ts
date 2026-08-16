import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo_t035' });
const ids = { skill: 't070-skill', version: 't070-version' };

beforeAll(async () => {
  await pool.query(`INSERT INTO skill_definitions(id,skill_key,owner_context) VALUES ($1,'t070.general','ai-routing') ON CONFLICT DO NOTHING`, [ids.skill]);
  await pool.query(`INSERT INTO skill_versions(id,skill_id,version,prompt_policy_json,model_policy_json,tool_policy_json,safety_json) VALUES ($1,$2,1,'{}','{}','{}','{}') ON CONFLICT DO NOTHING`, [ids.version, ids.skill]);
});

afterAll(async () => {
  await pool.query('DELETE FROM session_classifications WHERE skill_version_id=$1', [ids.version]);
  await pool.query('DELETE FROM skill_versions WHERE id=$1', [ids.version]);
  await pool.query('DELETE FROM skill_definitions WHERE id=$1', [ids.skill]);
  await pool.end();
});

describe('versioned skills schema', () => {
  it('enforces unique versions and bounded classification confidence', async () => {
    await expect(pool.query(`INSERT INTO skill_versions(id,skill_id,version,prompt_policy_json,model_policy_json,tool_policy_json,safety_json) VALUES ('t070-duplicate',$1,1,'{}','{}','{}','{}')`, [ids.skill])).rejects.toMatchObject({ code: '23505' });
    await expect(pool.query(`INSERT INTO session_classifications(id,session_id,intent,confidence) VALUES ('t070-classification','session-1','general',1.1)`)).rejects.toMatchObject({ code: '23514' });
  });
});
