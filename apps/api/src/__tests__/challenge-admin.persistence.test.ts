import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PostgresChallengeAdminRepository } from '../infrastructure/adapters/postgres/PostgresChallengeAdminRepository.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const id = 't065-challenge';

beforeEach(async () => {
  await pool.query('DELETE FROM challenge_reward_rules WHERE challenge_version_id IN (SELECT v.id FROM challenge_versions v JOIN challenge_definitions d ON d.id=v.challenge_id WHERE d.challenge_key=$1)', [id]);
  await pool.query('DELETE FROM challenge_versions WHERE challenge_id IN (SELECT id FROM challenge_definitions WHERE challenge_key=$1)', [id]);
  await pool.query('DELETE FROM challenge_definitions WHERE challenge_key=$1', [id]);
});

afterAll(async () => {
  await pool.query('DELETE FROM challenge_reward_rules WHERE challenge_version_id IN (SELECT v.id FROM challenge_versions v JOIN challenge_definitions d ON d.id=v.challenge_id WHERE d.challenge_key=$1)', [id]);
  await pool.query('DELETE FROM challenge_versions WHERE challenge_id IN (SELECT id FROM challenge_definitions WHERE challenge_key=$1)', [id]);
  await pool.query('DELETE FROM challenge_definitions WHERE challenge_key=$1', [id]);
  await pool.end();
});

describe('Postgres challenge administration', () => {
  it('persists draft, review, and published moderation states', async () => {
    const repository = new PostgresChallengeAdminRepository(pool);
    const created = await repository.create({ challengeKey: id, challengeType: 'QUIZ', verificationStrategy: 'quiz.v1', content: {}, rewardPolicy: {}, maxRewardCredits: 5n });
    expect(created).toMatchObject({ status: 'DRAFT', versionStatus: 'DRAFT', maxRewardCredits: '5' });
    await expect(repository.submit(created.id)).resolves.toMatchObject({ status: 'IN_REVIEW', versionStatus: 'DRAFT' });
    await expect(repository.approve(created.id)).resolves.toMatchObject({ status: 'APPROVED', versionStatus: 'PUBLISHED' });
  });
});
