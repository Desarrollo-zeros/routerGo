import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanup,
  countOperations,
  createWallet,
  operations,
  snapshot,
} from './economy-operations.integration.support';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo',
  max: 24,
});

describe.sequential('T024 PostgreSQL reservation races', () => {
  beforeAll(async () => { await pool.query('SELECT 1'); });
  afterAll(async () => { await pool.end(); });

  it('never oversettles when two different settlements race', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const results = await Promise.allSettled([
        app.settle.execute({ operationId: `${ids.key}-settle-a`, reservationId: reservation.reservationId, credits: 70n }),
        app.settle.execute({ operationId: `${ids.key}-settle-b`, reservationId: reservation.reservationId, credits: 60n }),
      ]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      const state = await snapshot(pool, ids.walletId);
      expect(state.settled === 70n || state.settled === 60n).toBe(true);
      expect(state.settled + state.released).toBeLessThanOrEqual(100n);
      expect(state.walletBalance).toBe(0n);
    } finally { await cleanup(pool, ids); }
  });

  it('never overrefunds when two different releases race', async () => {
    const ids = await createWallet(pool, 1000n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 50n });
      const results = await Promise.allSettled([
        app.release.execute({ operationId: `${ids.key}-release-a`, reservationId: reservation.reservationId, credits: 30n }),
        app.release.execute({ operationId: `${ids.key}-release-b`, reservationId: reservation.reservationId, credits: 30n }),
      ]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      const state = await snapshot(pool, ids.walletId);
      expect(state.released).toBe(30n);
      expect(state.refunds).toBe(30n);
      expect(state.walletBalance).toBe(930n);
      expect(state.settled + state.released).toBe(80n);
    } finally { await cleanup(pool, ids); }
  });

  it('refunds an expired reservation only once across duplicate callbacks', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await pool.query("UPDATE credit_reservations SET status='EXPIRED' WHERE id=$1", [reservation.reservationId]);
      const results = await Promise.all(Array.from({ length: 20 }, () =>
        app.release.execute({ operationId: `${ids.key}-expired-release`, reservationId: reservation.reservationId, credits: 100n })));
      expect(results.filter((result) => !result.reused)).toHaveLength(1);
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(100n);
      expect(state.refunds).toBe(100n);
      expect(state.released).toBe(100n);
      expect(await countOperations(pool, reservation.reservationId)).toBe(1);
    } finally { await cleanup(pool, ids); }
  });

  it('does not refund a cancelled reservation automatically', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await pool.query("UPDATE credit_reservations SET status='CANCELLED' WHERE id=$1", [reservation.reservationId]);
      await expect(app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 100n }))
        .rejects.toMatchObject({ code: 'INVALID_RESERVATION_STATE' });
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(0n);
      expect(state.refunds).toBe(0n);
      expect(state.released).toBe(0n);
      expect(await countOperations(pool, reservation.reservationId)).toBe(0);
    } finally { await cleanup(pool, ids); }
  });
});
