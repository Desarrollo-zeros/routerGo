import type pg from "pg";
import type { WalletLedgerReader, WalletLedgerRow } from "../../../application/ports/outbound/WalletLedgerReader.js";

type Row = { id: string; type: string; amount_signed: string; created_at: Date };

export class PostgresWalletLedgerReader implements WalletLedgerReader {
  constructor(private readonly pool: pg.Pool) {}

  async listByWallet(walletId: string, limit: number): Promise<WalletLedgerRow[]> {
    const result = await this.pool.query<Row>("SELECT id,type,amount_signed,created_at FROM ledger_entries WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT $2", [walletId, limit]);
    return result.rows.map((row) => ({ id: row.id, type: row.type, amount_signed: row.amount_signed, created_at: row.created_at.toISOString() }));
  }
}
