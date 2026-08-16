import { ChatRun, type RunEconomyStatus } from '../../../../domain/entities/ChatRun';

export interface ChatRunRow {
  id: string;
  quote_id: string;
  user_id: string;
  wallet_id: string;
  logical_model_id: string;
  status: string;
  charged_credits: string;
  idempotency_key: string;
  created_at: string | Date;
  completed_at: string | Date | null;
  economy_status?: RunEconomyStatus;
  reservation_id?: string | null;
  provider_request_id?: string | null;
  provider_cost_microusd?: string | bigint;
  input_tokens?: string | bigint;
  output_tokens?: string | bigint;
}

export const ChatRunMapper = {
  toDomain(row: ChatRunRow): ChatRun {
    return ChatRun.create({
      id: row.id,
      quoteId: row.quote_id,
      userId: row.user_id,
      walletId: row.wallet_id,
      modelId: row.logical_model_id,
      status: row.status as ChatRun['status'],
      creditsDebited: row.charged_credits,
      idempotencyKey: row.idempotency_key,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.completed_at ?? row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      errorCode: null,
      economyStatus: row.economy_status ?? 'UNRESERVED',
      reservationId: row.reservation_id ?? null,
      providerRequestId: row.provider_request_id ?? null,
      providerCostMicrousd: BigInt(row.provider_cost_microusd ?? 0),
      inputTokens: BigInt(row.input_tokens ?? 0),
      outputTokens: BigInt(row.output_tokens ?? 0),
    });
  },
  toRow(e: ChatRun): ChatRunRow {
    const p = e.toProps();
    return { id: p.id, quote_id: p.quoteId, user_id: p.userId, wallet_id: p.walletId, logical_model_id: p.modelId, status: p.status, charged_credits: p.creditsDebited, idempotency_key: p.idempotencyKey, created_at: p.createdAt.toISOString(), completed_at: p.completedAt ? p.completedAt.toISOString() : null, economy_status: e.economyStatus, reservation_id: e.reservationId, provider_request_id: e.providerRequestId, provider_cost_microusd: e.providerCostMicrousd.toString(), input_tokens: e.inputTokens.toString(), output_tokens: e.outputTokens.toString() };
  },
};
