import type { Pool } from 'pg';
import type { QuoteRepository } from '../../../application/ports/outbound/QuoteRepository';
import { ChatQuoteMapper } from './mappers/ChatQuoteMapper';

export class QuotePostgresRepository implements QuoteRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<import('../../../domain/entities/ChatQuote').ChatQuote | null> {
    const r = await this.pool.query(
      `SELECT q.*, w.id AS wallet_id, m.tier
       FROM chat_quotes q
       JOIN wallets w ON w.user_id=q.user_id
       JOIN model_catalog m ON m.logical_id=q.logical_model_id
       WHERE q.id=$1`, [id],
    );
    return r.rows[0] ? ChatQuoteMapper.toDomain(r.rows[0]) : null;
  }

  async findByIdempotency(walletId: string, key: string): Promise<import('../../../domain/entities/ChatQuote').ChatQuote | null> {
    const r = await this.pool.query(
      `SELECT q.*, w.id AS wallet_id, m.tier
       FROM chat_quotes q
       JOIN wallets w ON w.user_id=q.user_id
       JOIN model_catalog m ON m.logical_id=q.logical_model_id
       WHERE w.id=$1 AND q.request_hash=$2`, [walletId, key],
    );
    return r.rows[0] ? ChatQuoteMapper.toDomain(r.rows[0]) : null;
  }

  async save(quote: import('../../../domain/entities/ChatQuote').ChatQuote): Promise<void> {
    const row = ChatQuoteMapper.toRow(quote);
    await this.pool.query(
      `INSERT INTO chat_quotes (id,user_id,logical_model_id,credit_cost,max_output_tokens,request_hash,estimated_platform_cost_microusd,pricing_version,created_at,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [row.id, row.user_id, row.logical_model_id, row.credit_cost, row.max_output_tokens, row.request_hash, row.estimated_platform_cost_microusd, row.pricing_version, row.created_at, row.expires_at],
    );
  }
}
