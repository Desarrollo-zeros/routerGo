import type { Pool } from 'pg';
import type { QuoteRepository } from '../../../application/ports/outbound/QuoteRepository';
import { ChatQuoteMapper } from './mappers/ChatQuoteMapper';

export class QuotePostgresRepository implements QuoteRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<import('../../../domain/entities/ChatQuote').ChatQuote | null> {
    const r = await this.pool.query('SELECT * FROM chat_quotes WHERE id=$1', [id]);
    return r.rows[0] ? ChatQuoteMapper.toDomain(r.rows[0]) : null;
  }

  async findByIdempotency(walletId: string, key: string): Promise<import('../../../domain/entities/ChatQuote').ChatQuote | null> {
    const r = await this.pool.query('SELECT * FROM chat_quotes WHERE wallet_id=$1 AND idempotency_key=$2', [walletId, key]);
    return r.rows[0] ? ChatQuoteMapper.toDomain(r.rows[0]) : null;
  }

  async save(quote: import('../../../domain/entities/ChatQuote').ChatQuote): Promise<void> {
    const row = ChatQuoteMapper.toRow(quote);
    await this.pool.query(
      'INSERT INTO chat_quotes (id,user_id,wallet_id,model_id,tier,credit_price,idempotency_key,created_at,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (wallet_id,idempotency_key) DO NOTHING',
      [row.id, row.user_id, row.wallet_id, row.model_id, row.tier, row.credit_price, row.idempotency_key, row.created_at, row.expires_at],
    );
  }
}
