import { LedgerEntry } from '../../../../domain/entities/LedgerEntry';
import { Credits } from '../../../../domain/value-objects/Credits';

export interface LedgerRow {
  id: string;
  wallet_id: string;
  type: string;
  amount_signed: string;
  idempotency_key: string;
  request_hash: string | null;
  created_at: string | Date;
  meta_json: Record<string, unknown> | null;
}

export const LedgerMapper = {
  toDomain(row: LedgerRow): LedgerEntry {
    return LedgerEntry.create({
      id: row.id,
      walletId: row.wallet_id,
      kind: kindFromType(row.type),
      amount: Credits.of(abs(BigInt(row.amount_signed))),
      idempotencyKey: row.idempotency_key,
      refId: row.request_hash,
      createdAt: new Date(row.created_at),
      metadata: row.meta_json,
    });
  },
  toRow(e: LedgerEntry): LedgerRow {
    const p = e.toProps();
    return { id: p.id, wallet_id: p.walletId, type: p.kind.toUpperCase(), amount_signed: signedAmount(p.kind, p.amount), idempotency_key: p.idempotencyKey, request_hash: p.refId, created_at: p.createdAt.toISOString(), meta_json: p.metadata ?? null };
  },
};

function kindFromType(type: string): 'earn' | 'spend' | 'refund' {
  if (type === 'EARN') return 'earn';
  if (type === 'SPEND') return 'spend';
  if (type === 'REFUND') return 'refund';
  throw new Error(`Unknown ledger type: ${type}`);
}

function signedAmount(kind: 'earn' | 'spend' | 'refund', amount: Credits): string {
  const value = amount.toString();
  return kind === 'spend' ? `-${value}` : value;
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}
