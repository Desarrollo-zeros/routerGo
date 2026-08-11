import { ChatQuote } from '../../../../domain/entities/ChatQuote';
import { Credits } from '../../../../domain/value-objects/Credits';

export interface QuoteRow {
  id: string;
  user_id: string;
  wallet_id: string;
  model_id: string;
  tier: string;
  credit_price: string;
  idempotency_key: string;
  created_at: string | Date;
  expires_at: string | Date;
}

export const ChatQuoteMapper = {
  toDomain(row: QuoteRow): ChatQuote {
    return ChatQuote.create({
      id: row.id,
      userId: row.user_id,
      walletId: row.wallet_id,
      modelId: row.model_id,
      tier: row.tier,
      creditPrice: Credits.of(BigInt(row.credit_price)),
      idempotencyKey: row.idempotency_key,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
    });
  },
  toRow(e: ChatQuote): QuoteRow {
    const p = e.toProps();
    return { id: p.id, user_id: p.userId, wallet_id: p.walletId, model_id: p.modelId, tier: p.tier, credit_price: p.creditPrice.toString(), idempotency_key: p.idempotencyKey, created_at: p.createdAt.toISOString(), expires_at: p.expiresAt.toISOString() };
  },
};
