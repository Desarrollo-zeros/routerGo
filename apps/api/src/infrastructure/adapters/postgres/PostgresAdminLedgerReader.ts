import type pg from 'pg';
import type { AdminLedgerReader } from '../../../application/ports/outbound/AdminLedgerReader.js';
import type { LedgerReadRow } from '../../../application/ports/inbound/GetLedgerPort.js';

type Row = { id: string; type: string; amount_signed: string; created_at: Date };

export class PostgresAdminLedgerReader implements AdminLedgerReader {
  constructor(private readonly pool: pg.Pool) {}

  async listByOrganization(organizationId: string, limit: number): Promise<LedgerReadRow[]> {
    const result = await this.pool.query<Row>(
      `SELECT l.id, l.type, l.amount_signed, l.created_at
       FROM ledger_entries l JOIN wallets w ON w.id=l.wallet_id
       JOIN organization_members m ON m.user_id=w.user_id
       WHERE m.organization_id=$1 AND m.status='ACTIVE'
       ORDER BY l.created_at DESC LIMIT $2`,
      [organizationId, limit],
    );
    return result.rows.map((row) => ({ id: row.id, kind: row.type, amount: row.amount_signed, occurredAt: row.created_at.toISOString() }));
  }
}
