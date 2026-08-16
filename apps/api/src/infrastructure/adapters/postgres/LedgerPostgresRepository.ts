import type { Pool } from 'pg';
import type { LedgerRepository } from '../../../application/ports/outbound/LedgerRepository';
import { Credits } from '../../../domain/value-objects/Credits';
import { LedgerMapper } from './mappers/LedgerMapper';

export class LedgerPostgresRepository implements LedgerRepository {
  constructor(private readonly pool: Pool) {}

  async findByIdempotency(walletId: string, key: string): Promise<import('../../../domain/entities/LedgerEntry').LedgerEntry | null> {
    const r = await this.pool.query('SELECT * FROM ledger_entries WHERE wallet_id=$1 AND idempotency_key=$2', [walletId, key]);
    return r.rows[0] ? LedgerMapper.toDomain(r.rows[0]) : null;
  }

  async insert(entry: import('../../../domain/entities/LedgerEntry').LedgerEntry): Promise<void> {
    const row = LedgerMapper.toRow(entry);
    await this.pool.query(
      'INSERT INTO ledger_entries (id,wallet_id,type,amount_signed,idempotency_key,request_hash,created_at,meta_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (wallet_id,idempotency_key) DO NOTHING',
      [row.id, row.wallet_id, row.type, row.amount_signed, row.idempotency_key, row.request_hash, row.created_at, JSON.stringify(row.meta_json ?? {})],
    );
  }

  async sumEarnedToday(walletId: string, dayStart: Date): Promise<Credits> {
    const r = await this.pool.query("SELECT COALESCE(SUM(amount_signed),0) as total FROM ledger_entries WHERE wallet_id=$1 AND type='EARN' AND created_at >= $2", [walletId, dayStart]);
    return Credits.of(BigInt(r.rows[0].total));
  }

  async listByWallet(walletId: string, limit: number): Promise<import('../../../domain/entities/LedgerEntry').LedgerEntry[]> {
    const r = await this.pool.query('SELECT * FROM ledger_entries WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT $2', [walletId, limit]);
    return r.rows.map(LedgerMapper.toDomain);
  }
}
