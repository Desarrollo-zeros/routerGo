import { ChatQuote } from '../../../../domain/entities/ChatQuote';
import { Credits } from '../../../../domain/value-objects/Credits';

export interface QuoteRow {
  id: string;
  user_id: string;
  wallet_id: string;
  logical_model_id: string;
  tier: string;
  credit_cost: string;
  request_hash: string;
  created_at: string | Date;
  expires_at: string | Date;
  estimated_platform_cost_microusd?: string | bigint;
  pricing_version?: string;
  max_output_tokens?: number;
}

export const ChatQuoteMapper = {
  toDomain(row: QuoteRow): ChatQuote {
    return ChatQuote.create({
      id: row.id,
      userId: row.user_id,
      walletId: row.wallet_id,
      modelId: row.logical_model_id,
      tier: row.tier,
      creditPrice: Credits.of(BigInt(row.credit_cost)),
      estimatedPlatformCostMicrousd: BigInt(row.estimated_platform_cost_microusd ?? 0),
      pricingVersion: row.pricing_version ?? 'catalog-v1',
      maxOutputTokens: row.max_output_tokens ?? 4096,
      idempotencyKey: row.request_hash,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
    });
  },
  toRow(e: ChatQuote): QuoteRow {
    const p = e.toProps();
    return { id: p.id, user_id: p.userId, wallet_id: p.walletId, logical_model_id: p.modelId, tier: p.tier, credit_cost: p.creditPrice.toString(), request_hash: p.idempotencyKey, created_at: p.createdAt.toISOString(), expires_at: p.expiresAt.toISOString(), estimated_platform_cost_microusd: e.estimatedPlatformCostMicrousd.toString(), pricing_version: e.pricingVersion, max_output_tokens: e.maxOutputTokens };
  },
};
