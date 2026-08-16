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
