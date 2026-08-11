import { ChatRun } from '../../../../domain/entities/ChatRun';

export interface ChatRunRow {
  id: string;
  quote_id: string;
  user_id: string;
  wallet_id: string;
  model_id: string;
  status: string;
  credits_debited: string;
  idempotency_key: string;
  created_at: string | Date;
  updated_at: string | Date;
  completed_at: string | Date | null;
  error_code: string | null;
}

export const ChatRunMapper = {
  toDomain(row: ChatRunRow): ChatRun {
    return ChatRun.create({
      id: row.id,
      quoteId: row.quote_id,
      userId: row.user_id,
      walletId: row.wallet_id,
      modelId: row.model_id,
      status: row.status as never,
      creditsDebited: row.credits_debited,
      idempotencyKey: row.idempotency_key,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      errorCode: row.error_code,
    });
  },
  toRow(e: ChatRun): ChatRunRow {
    const p = e.toProps();
    return { id: p.id, quote_id: p.quoteId, user_id: p.userId, wallet_id: p.walletId, model_id: p.modelId, status: p.status, credits_debited: p.creditsDebited, idempotency_key: p.idempotencyKey, created_at: p.createdAt.toISOString(), updated_at: p.updatedAt.toISOString(), completed_at: p.completedAt ? p.completedAt.toISOString() : null, error_code: p.errorCode ?? null };
  },
};
