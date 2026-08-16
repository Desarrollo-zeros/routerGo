import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanup,
  createWallet,
  operations,
  snapshot,
} from './economy-operations.integration.support';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo',
  max: 24,
});

describe.sequential('T024 PostgreSQL concurrency hardening', () => {
  beforeAll(async () => { await pool.query('SELECT 1'); });
  afterAll(async () => { await pool.end(); });

  it('prevents concurrent distinct reserves from overspending', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const results = await Promise.allSettled([
        app.reserve.execute({ operationId: `${ids.key}-o1`, walletId: ids.walletId, credits: 80n }),
        app.reserve.execute({ operationId: `${ids.key}-o2`, walletId: ids.walletId, credits: 80n }),
      ]);
      const rejected = results.filter((result) => result.status === 'rejected');
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ code: 'INSUFFICIENT_CREDITS' });
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(20n);
      expect(state.spend).toBe(80n);
      expect(state.reservationCount).toBe(1n);
      expectReconciled(state);
    } finally { await cleanup(pool, ids); }
  });

  it('survives high contention with exactly ten successful reserves', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
        app.reserve.execute({ operationId: `${ids.key}-o-${index}`, walletId: ids.walletId, credits: 10n })));
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(10);
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(0n);
      expect(state.spend).toBe(100n);
      expect(state.reservationCount).toBe(10n);
      expectReconciled(state);
    } finally { await cleanup(pool, ids); }
  });

  it('applies one economic effect for twenty concurrent same-key reserves', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const results = await Promise.all(Array.from({ length: 20 }, () =>
        app.reserve.execute({ operationId: `${ids.key}-same`, walletId: ids.walletId, credits: 40n })));
      expect(results.filter((result) => result.reused)).toHaveLength(19);
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(60n);
      expect(state.spend).toBe(40n);
      expect(state.reservationCount).toBe(1n);
      expectReconciled(state);
    } finally { await cleanup(pool, ids); }
  });

  it('keeps bigint exact while concurrent reservations contend', async () => {
    const initial = 9007199254740993123n;
    const ids = await createWallet(pool, initial);
    try {
      const app = operations(pool);
      await Promise.all([
        app.reserve.execute({ operationId: `${ids.key}-a`, walletId: ids.walletId, credits: 100n }),
        app.reserve.execute({ operationId: `${ids.key}-b`, walletId: ids.walletId, credits: 200n }),
      ]);
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(initial - 300n);
      expect(state.spend).toBe(300n);
      expectReconciled(state);
    } finally { await cleanup(pool, ids); }
  });

  it('preserves accounting when settle and release race valid amounts', async () => {
    const ids = await createWallet(pool, 1000n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const results = await Promise.allSettled([
        app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 72n }),
        app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 28n }),
      ]);
      expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(928n);
      expect(state.spend).toBe(100n);
      expect(state.refunds).toBe(28n);
      expect(state.settled).toBe(72n);
      expect(state.released).toBe(28n);
      expect(state.remaining).toBe(0n);
      expectReconciled(state);
    } finally { await cleanup(pool, ids); }
  });

  it('rejects settle and release overcommit without violating reservation bounds', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const results = await Promise.allSettled([
        app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 80n }),
        app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 30n }),
      ]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      const state = await snapshot(pool, ids.walletId);
      expect(state.settled + state.released).toBeLessThanOrEqual(100n);
      expect(state.walletBalance).toBe(state.released);
      expectReconciled(state);
    } finally { await cleanup(pool, ids); }
  });
});

function expectReconciled(state: Awaited<ReturnType<typeof snapshot>>): void {
  expect(state.walletBalance >= 0n).toBe(true);
  expect(state.walletBalance).toBe(state.ledgerBalance);
  expect(state.reserved).toBe(state.settled + state.released + state.remaining);
  expect(state.settled + state.released <= state.reserved).toBe(true);
}
