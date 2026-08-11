import { LedgerEntry } from '../../../../domain/entities/LedgerEntry';
import { Credits } from '../../../../domain/value-objects/Credits';

export interface LedgerRow {
  id: string;
  wallet_id: string;
  kind: string;
  amount: string;
  idempotency_key: string;
  ref_id: string | null;
  created_at: string | Date;
  metadata: Record<string, unknown> | null;
}

export const LedgerMapper = {
  toDomain(row: LedgerRow): LedgerEntry {
    return LedgerEntry.create({
      id: row.id,
      walletId: row.wallet_id,
      kind: row.kind as never,
      amount: Credits.of(BigInt(row.amount)),
      idempotencyKey: row.idempotency_key,
      refId: row.ref_id,
      createdAt: new Date(row.created_at),
      metadata: row.metadata,
    });
  },
  toRow(e: LedgerEntry): LedgerRow {
    const p = e.toProps();
    return { id: p.id, wallet_id: p.walletId, kind: p.kind, amount: p.amount.toString(), idempotency_key: p.idempotencyKey, ref_id: p.refId, created_at: p.createdAt.toISOString(), metadata: (p.metadata as never) ?? null };
  },
};
