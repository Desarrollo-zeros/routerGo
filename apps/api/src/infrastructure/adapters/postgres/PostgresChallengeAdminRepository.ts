import type { Pool, PoolClient } from 'pg';
import type { ChallengeAdminReader, ChallengeAdminView, ChallengeAdminWriter, CreateChallengeInput } from '../../../application/ports/inbound/ChallengeAdminPort.js';

type Row = { id: string; challenge_key: string; challenge_type: string; verification_strategy: string; status: string; version: number; version_status: string; max_reward_credits: string };

export class PostgresChallengeAdminRepository implements ChallengeAdminReader, ChallengeAdminWriter {
  constructor(private readonly pool: Pool) {}

  async list(): Promise<ChallengeAdminView[]> {
    const result = await this.pool.query<Row>(`${this.selectSql()} ORDER BY d.updated_at DESC`);
    return result.rows.map(toView);
  }

  async create(input: CreateChallengeInput): Promise<ChallengeAdminView> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const definition = await client.query<{ id: string }>(
        `INSERT INTO challenge_definitions(id,challenge_key,challenge_type,verification_strategy)
         VALUES (gen_random_uuid()::text,$1,$2,$3) RETURNING id`,
        [input.challengeKey, input.challengeType, input.verificationStrategy]);
      const id = definition.rows[0].id;
      await client.query(
        `INSERT INTO challenge_versions(id,challenge_id,version,content_json,reward_policy_json)
         VALUES (gen_random_uuid()::text,$1,1,$2,$3)`, [id, input.content, input.rewardPolicy]);
      await client.query(
        `INSERT INTO challenge_reward_rules(id,challenge_version_id,policy_json,max_reward_credits)
         SELECT gen_random_uuid()::text,id,$1,$2 FROM challenge_versions WHERE challenge_id=$3 AND version=1`,
        [input.rewardPolicy, input.maxRewardCredits.toString(), id]);
      await client.query('COMMIT');
      return (await this.findById(client, id)) as ChallengeAdminView;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async submit(challengeId: string): Promise<ChallengeAdminView> { return this.transition(challengeId, 'IN_REVIEW', 'DRAFT', 'DRAFT'); }
  async approve(challengeId: string): Promise<ChallengeAdminView> { return this.transition(challengeId, 'APPROVED', 'IN_REVIEW', 'PUBLISHED'); }

  private async transition(challengeId: string, status: string, from: string, versionStatus: string): Promise<ChallengeAdminView> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const changed = await client.query(`UPDATE challenge_definitions SET status=$1,updated_at=now() WHERE id=$2 AND status=$3`, [status, challengeId, from]);
      if (changed.rowCount !== 1) throw new Error('CHALLENGE_INVALID_TRANSITION');
      await client.query(`UPDATE challenge_versions SET status=$1 WHERE challenge_id=$2 AND version=(SELECT max(version) FROM challenge_versions WHERE challenge_id=$2)`, [versionStatus, challengeId]);
      await client.query('COMMIT');
      return (await this.findById(client, challengeId)) as ChallengeAdminView;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  private async findById(client: PoolClient, id: string): Promise<ChallengeAdminView | undefined> {
    const result = await client.query<Row>(`${this.selectSql()} AND d.id=$1`, [id]);
    return result.rows[0] ? toView(result.rows[0]) : undefined;
  }

  private selectSql(): string {
    return `SELECT d.id,d.challenge_key,d.challenge_type,d.verification_strategy,d.status,v.version,v.status AS version_status,r.max_reward_credits::text
      FROM challenge_definitions d JOIN challenge_versions v ON v.challenge_id=d.id
      JOIN challenge_reward_rules r ON r.challenge_version_id=v.id WHERE v.version=(SELECT max(v2.version) FROM challenge_versions v2 WHERE v2.challenge_id=d.id)`;
  }
}

function toView(row: Row): ChallengeAdminView { return { id: row.id, challengeKey: row.challenge_key, challengeType: row.challenge_type, verificationStrategy: row.verification_strategy, status: row.status, version: row.version, versionStatus: row.version_status, maxRewardCredits: row.max_reward_credits }; }
