import type { Pool } from 'pg';
import type { RunRepository } from '../../../application/ports/outbound/RunRepository';
import { ChatRunMapper } from './mappers/ChatRunMapper';

export class RunPostgresRepository implements RunRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<import('../../../domain/entities/ChatRun').ChatRun | null> {
    const r = await this.pool.query(
      'SELECT r.*, w.id AS wallet_id FROM chat_runs r JOIN wallets w ON w.user_id=r.user_id WHERE r.id=$1', [id],
    );
    return r.rows[0] ? ChatRunMapper.toDomain(r.rows[0]) : null;
  }

  async findByIdempotency(walletId: string, key: string): Promise<import('../../../domain/entities/ChatRun').ChatRun | null> {
    const r = await this.pool.query(
      'SELECT r.*, w.id AS wallet_id FROM chat_runs r JOIN wallets w ON w.user_id=r.user_id WHERE w.id=$1 AND r.idempotency_key=$2', [walletId, key],
    );
    return r.rows[0] ? ChatRunMapper.toDomain(r.rows[0]) : null;
  }

  async save(run: import('../../../domain/entities/ChatRun').ChatRun): Promise<void> {
    const row = ChatRunMapper.toRow(run);
    await this.pool.query(
      `INSERT INTO chat_runs (id,quote_id,user_id,logical_model_id,status,charged_credits,idempotency_key,created_at,completed_at,reservation_id,economy_status,provider_request_id,provider_cost_microusd,input_tokens,output_tokens)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, charged_credits=EXCLUDED.charged_credits, completed_at=EXCLUDED.completed_at,
         reservation_id=EXCLUDED.reservation_id, economy_status=EXCLUDED.economy_status, provider_request_id=EXCLUDED.provider_request_id,
         provider_cost_microusd=EXCLUDED.provider_cost_microusd, input_tokens=EXCLUDED.input_tokens, output_tokens=EXCLUDED.output_tokens`,
      [row.id, row.quote_id, row.user_id, row.logical_model_id, row.status, row.charged_credits, row.idempotency_key, row.created_at, row.completed_at, row.reservation_id ?? null, row.economy_status ?? 'UNRESERVED', row.provider_request_id ?? null, row.provider_cost_microusd ?? '0', row.input_tokens ?? 0, row.output_tokens ?? 0],
    );
  }
}
