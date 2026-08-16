import type { Pool } from 'pg';
import { nanoid } from 'nanoid';
import { ReleaseCreditsUseCase } from '../application/use-cases/ReleaseCredits';
import { ReserveCreditsUseCase } from '../application/use-cases/ReserveCredits';
import { SettleCreditsUseCase } from '../application/use-cases/SettleCredits';
import { SystemClock } from '../application/ports/outbound/Clock';
import { PgEconomyUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgEconomyUnitOfWork';

export function operations(pool: Pool) {
  const factory = new PgEconomyUnitOfWorkFactory(pool);
  const clock = new SystemClock();
  return {
    reserve: new ReserveCreditsUseCase(factory, clock),
    settle: new SettleCreditsUseCase(factory),
    release: new ReleaseCreditsUseCase(factory, clock),
  };
}

export async function createWallet(pool: Pool, initial: bigint): Promise<{ key: string; userId: string; walletId: string }> {
  const key = `t023-${nanoid(8)}`;
  const userId = `${key}-user`;
  const walletId = `${key}-wallet`;
  await pool.query('INSERT INTO users(id,email) VALUES ($1,$2)', [userId, `${userId}@test.local`]);
  await pool.query('INSERT INTO wallets(id,user_id,balance,version) VALUES ($1,$2,$3,0)', [walletId, userId, initial.toString()]);
  if (initial > 0n) {
    await pool.query(
      "INSERT INTO ledger_entries(id,wallet_id,type,amount_signed,idempotency_key) VALUES ($1,$2,'EARN',$3,$4)",
      [`${key}-initial-ledger`, walletId, initial.toString(), `${key}-initial`],
    );
  }
  return { key, userId, walletId };
}

export async function cleanup(pool: Pool, ids: { userId: string; walletId: string }): Promise<void> {
  await pool.query('DELETE FROM credit_reservation_operations WHERE reservation_id IN (SELECT id FROM credit_reservations WHERE wallet_id=$1)', [ids.walletId]);
  await pool.query('DELETE FROM credit_reservations WHERE wallet_id=$1', [ids.walletId]);
  await pool.query('DELETE FROM ledger_entries WHERE wallet_id=$1', [ids.walletId]);
  await pool.query('DELETE FROM wallets WHERE id=$1', [ids.walletId]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.userId]);
}

export async function walletBalance(pool: Pool, walletId: string): Promise<bigint> {
  const result = await pool.query<{ balance: string }>('SELECT balance FROM wallets WHERE id=$1', [walletId]);
  return BigInt(result.rows[0].balance);
}

export async function reservationRow(pool: Pool, reservationId: string): Promise<Record<string, string>> {
  const result = await pool.query<Record<string, string>>(
    'SELECT reserved_credits,settled_credits,released_credits,status FROM credit_reservations WHERE id=$1',
    [reservationId],
  );
  return result.rows[0];
}

export async function sumLedger(pool: Pool, walletId: string): Promise<bigint> {
  const result = await pool.query<{ total: string }>('SELECT COALESCE(SUM(amount_signed),0) AS total FROM ledger_entries WHERE wallet_id=$1', [walletId]);
  return BigInt(result.rows[0].total);
}

export async function ledgerKinds(pool: Pool, walletId: string): Promise<string[]> {
  const result = await pool.query<{ type: string }>('SELECT type FROM ledger_entries WHERE wallet_id=$1 ORDER BY created_at,id', [walletId]);
  return result.rows.map((row) => row.type);
}

export async function count(
  pool: Pool,
  table: 'credit_reservations' | 'ledger_entries',
  walletId: string,
  extra = '',
): Promise<number> {
  const suffix = extra ? ` AND ${extra}` : '';
  const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${table} WHERE wallet_id=$1${suffix}`, [walletId]);
  return Number(result.rows[0].count);
}

export async function countOperations(pool: Pool, reservationId: string): Promise<number> {
  const result = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM credit_reservation_operations WHERE reservation_id=$1', [reservationId]);
  return Number(result.rows[0].count);
}

export interface EconomySnapshot {
  walletBalance: bigint;
  ledgerBalance: bigint;
  spend: bigint;
  refunds: bigint;
  reserved: bigint;
  settled: bigint;
  released: bigint;
  remaining: bigint;
  reservationCount: bigint;
}

export async function snapshot(pool: Pool, walletId: string): Promise<EconomySnapshot> {
  const wallet = await pool.query<{ balance: string }>('SELECT balance FROM wallets WHERE id=$1', [walletId]);
  const ledger = await pool.query<{ balance: string; spend: string; refunds: string }>(
    `SELECT COALESCE(SUM(amount_signed),0)::text AS balance,
            COALESCE(SUM(CASE WHEN type='SPEND' THEN -amount_signed ELSE 0 END),0)::text AS spend,
            COALESCE(SUM(CASE WHEN type='REFUND' THEN amount_signed ELSE 0 END),0)::text AS refunds
     FROM ledger_entries WHERE wallet_id=$1`,
    [walletId],
  );
  const reservations = await pool.query<{ count: string; reserved: string; settled: string; released: string; remaining: string }>(
    `SELECT count(*)::text AS count, COALESCE(SUM(reserved_credits),0)::text AS reserved,
            COALESCE(SUM(settled_credits),0)::text AS settled,
            COALESCE(SUM(released_credits),0)::text AS released,
            COALESCE(SUM(reserved_credits-settled_credits-released_credits),0)::text AS remaining
     FROM credit_reservations WHERE wallet_id=$1`,
    [walletId],
  );
  const row = ledger.rows[0];
  const reservation = reservations.rows[0];
  return {
    walletBalance: BigInt(wallet.rows[0].balance), ledgerBalance: BigInt(row.balance),
    spend: BigInt(row.spend), refunds: BigInt(row.refunds), reserved: BigInt(reservation.reserved),
    settled: BigInt(reservation.settled), released: BigInt(reservation.released),
    remaining: BigInt(reservation.remaining), reservationCount: BigInt(reservation.count),
  };
}

export async function insertReservationBlocker(pool: Pool, walletId: string, reservationId: string): Promise<void> {
  await pool.query(
    `INSERT INTO credit_reservations
       (id,wallet_id,operation_id,reserved_credits,status)
     VALUES ($1,$2,$3,1,'RESERVED')`,
    [reservationId, walletId, `blocker-${reservationId}`],
  );
}

export async function deleteReservation(pool: Pool, reservationId: string): Promise<void> {
  await pool.query('DELETE FROM credit_reservations WHERE id=$1', [reservationId]);
}
