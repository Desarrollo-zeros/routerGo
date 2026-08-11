import type { Pool } from 'pg';
import type { RunRepository } from '../../../application/ports/outbound/RunRepository';
import { ChatRunMapper } from './mappers/ChatRunMapper';

export class RunPostgresRepository implements RunRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<import('../../../domain/entities/ChatRun').ChatRun | null> {
    const r = await this.pool.query('SELECT * FROM chat_runs WHERE id=$1', [id]);
    return r.rows[0] ? ChatRunMapper.toDomain(r.rows[0]) : null;
  }

  async findByIdempotency(walletId: string, key: string): Promise<import('../../../domain/entities/ChatRun').ChatRun | null> {
    const r = await this.pool.query('SELECT * FROM chat_runs WHERE wallet_id=$1 AND idempotency_key=$2', [walletId, key]);
    return r.rows[0] ? ChatRunMapper.toDomain(r.rows[0]) : null;
  }

  async save(run: import('../../../domain/entities/ChatRun').ChatRun): Promise<void> {
    const row = ChatRunMapper.toRow(run);
    await this.pool.query(
      `INSERT INTO chat_runs (id,quote_id,user_id,wallet_id,model_id,status,credits_debited,idempotency_key,created_at,updated_at,completed_at,error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, updated_at=EXCLUDED.updated_at, completed_at=EXCLUDED.completed_at, error_code=EXCLUDED.error_code`,
      [row.id, row.quote_id, row.user_id, row.wallet_id, row.model_id, row.status, row.credits_debited, row.idempotency_key, row.created_at, row.updated_at, row.completed_at, row.error_code],
    );
  }
}
