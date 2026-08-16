import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Credits } from '../domain/value-objects/Credits';
import { PgEconomyUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgEconomyUnitOfWork';
import {
  cleanup,
  count,
  countOperations,
  createWallet,
  ledgerKinds,
  operations,
  reservationRow,
  sumLedger,
  walletBalance,
} from './economy-operations.integration.support';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo',
  max: 20,
});

describe.sequential('T023 PostgreSQL economy operations', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('commits reserve with wallet debit, reservation, and spend ledger effect', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const result = await operations(pool).reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 80n });
      const wallet = await walletBalance(pool, ids.walletId);
      const reservation = await pool.query('SELECT reserved_credits,status FROM credit_reservations WHERE id=$1', [result.reservationId]);
      const ledger = await pool.query('SELECT type,amount_signed FROM ledger_entries WHERE wallet_id=$1 AND idempotency_key=$2', [ids.walletId, `reserve:${ids.key}-reserve`]);

      expect(result.walletBalance).toBe(20n);
      expect(wallet).toBe(20n);
      expect(reservation.rows[0]).toMatchObject({ reserved_credits: '80', status: 'RESERVED' });
      expect(ledger.rows[0]).toMatchObject({ type: 'SPEND', amount_signed: '-80' });
    } finally { await cleanup(pool, ids); }
  });

  it('rejects insufficient balance without any durable effects', async () => {
    const ids = await createWallet(pool, 50n);
    try {
      await expect(operations(pool).reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 80n }))
        .rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });
      expect(await walletBalance(pool, ids.walletId)).toBe(50n);
      expect(await count(pool, 'credit_reservations', ids.walletId)).toBe(0);
      expect(await count(pool, 'ledger_entries', ids.walletId, "type='SPEND'")).toBe(0);
    } finally { await cleanup(pool, ids); }
  });

  it('rolls back a wallet mutation when the transaction fails afterward', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const factory = new PgEconomyUnitOfWorkFactory(pool);
      await expect(factory.withTransaction(async (scope) => {
        const wallet = await scope.wallets.findByIdForUpdate(ids.walletId);
        if (!wallet) throw new Error('wallet missing');
        wallet.debit(Credits.fromBigInt(80n));
        await scope.wallets.save(wallet);
        throw new Error('injected transaction failure');
      })).rejects.toThrow('injected transaction failure');

      expect(await walletBalance(pool, ids.walletId)).toBe(100n);
      expect(await count(pool, 'credit_reservations', ids.walletId)).toBe(0);
      expect(await sumLedger(pool, ids.walletId)).toBe(100n);
    } finally { await cleanup(pool, ids); }
  });

  it('reconciles reserve 100, settle 72, release 28 without double charging', async () => {
    const ids = await createWallet(pool, 1000n);
    try {
      const app = operations(pool);
      const reserved = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reserved.reservationId, credits: 72n });
      const released = await app.release.execute({ operationId: `${ids.key}-release`, reservationId: reserved.reservationId, credits: 28n });
      const row = await reservationRow(pool, released.reservationId);
      const finalWallet = await walletBalance(pool, ids.walletId);

      expect(finalWallet).toBe(928n);
      expect(1000n - finalWallet).toBe(72n);
      expect(row).toMatchObject({ reserved_credits: '100', settled_credits: '72', released_credits: '28', status: 'RELEASED' });
      expect(await sumLedger(pool, ids.walletId)).toBe(finalWallet);
      expect((await ledgerKinds(pool, ids.walletId)).sort()).toEqual(['EARN', 'REFUND', 'SPEND']);
    } finally { await cleanup(pool, ids); }
  });

  it('makes reserve idempotent across repeated commands', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const input = { operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 80n };
      const first = await app.reserve.execute(input);
      const second = await app.reserve.execute(input);

      expect(second).toMatchObject({ reservationId: first.reservationId, reused: true });
      expect(await walletBalance(pool, ids.walletId)).toBe(20n);
      expect(await count(pool, 'credit_reservations', ids.walletId)).toBe(1);
      expect(await count(pool, 'ledger_entries', ids.walletId, "type='SPEND'")).toBe(1);
    } finally { await cleanup(pool, ids); }
  });

  it('makes release idempotent without a second refund', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 28n });
      const input = { operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 28n };
      await app.release.execute(input);
      const retry = await app.release.execute(input);

      expect(retry.reused).toBe(true);
      expect(await walletBalance(pool, ids.walletId)).toBe(100n);
      expect(await count(pool, 'ledger_entries', ids.walletId, "type='REFUND'")).toBe(1);
    } finally { await cleanup(pool, ids); }
  });

  it('makes settle idempotent without settling twice', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const input = { operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 72n };
      await app.settle.execute(input);
      const retry = await app.settle.execute(input);
      const row = await reservationRow(pool, reservation.reservationId);

      expect(retry.reused).toBe(true);
      expect(row).toMatchObject({ settled_credits: '72', released_credits: '0' });
      expect(await countOperations(pool, reservation.reservationId)).toBe(1);
    } finally { await cleanup(pool, ids); }
  });

  it('allows release of a reservation already marked expired', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await pool.query("UPDATE credit_reservations SET status='EXPIRED' WHERE id=$1", [reservation.reservationId]);
      const result = await app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 100n });

      expect(result.status).toBe('RELEASED');
      expect(await walletBalance(pool, ids.walletId)).toBe(100n);
    } finally { await cleanup(pool, ids); }
  });

  it('serializes concurrent reserves so only one can spend 100 credits', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const results = await Promise.allSettled([
        app.reserve.execute({ operationId: `${ids.key}-reserve-a`, walletId: ids.walletId, credits: 80n }),
        app.reserve.execute({ operationId: `${ids.key}-reserve-b`, walletId: ids.walletId, credits: 80n }),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      expect(await walletBalance(pool, ids.walletId)).toBe(20n);
      expect(await count(pool, 'credit_reservations', ids.walletId)).toBe(1);
      expect(await sumLedger(pool, ids.walletId)).toBe(20n);
    } finally { await cleanup(pool, ids); }
  });

  it('serializes settle and release on one reservation', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const results = await Promise.allSettled([
        app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 60n }),
        app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 40n }),
      ]);
      const row = await reservationRow(pool, reservation.reservationId);

      expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
      expect(row).toMatchObject({ settled_credits: '60', released_credits: '40', status: 'RELEASED' });
      expect(await walletBalance(pool, ids.walletId)).toBe(40n);
    } finally { await cleanup(pool, ids); }
  });
});
