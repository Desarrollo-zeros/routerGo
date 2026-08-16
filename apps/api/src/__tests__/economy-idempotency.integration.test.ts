import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanup,
  count,
  countOperations,
  createWallet,
  operations,
  reservationRow,
  snapshot,
} from './economy-operations.integration.support';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo',
  max: 24,
});

describe.sequential('T024 PostgreSQL idempotency hardening', () => {
  beforeAll(async () => { await pool.query('SELECT 1'); });
  afterAll(async () => { await pool.end(); });

  it('rejects reserve key reuse with a different amount', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 40n });
      await expect(app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 60n }))
        .rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(60n);
      expect(state.spend).toBe(40n);
      expect(state.reservationCount).toBe(1n);
    } finally { await cleanup(pool, ids); }
  });

  it('rejects settle key reuse with a different amount', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 72n });
      await expect(app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 80n }))
        .rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      expect((await reservationRow(pool, reservation.reservationId)).settled_credits).toBe('72');
      expect(await countOperations(pool, reservation.reservationId)).toBe(1);
      expect(await snapshot(pool, ids.walletId)).toMatchObject({ walletBalance: 0n });
    } finally { await cleanup(pool, ids); }
  });

  it('rejects release key reuse with a different amount', async () => {
    const ids = await createWallet(pool, 1000n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 72n });
      await app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 28n });
      await expect(app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 20n }))
        .rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(928n);
      expect(state.refunds).toBe(28n);
      expect(state.released).toBe(28n);
    } finally { await cleanup(pool, ids); }
  });

  it('treats operation kind as part of the idempotency key contract', async () => {
    const ids = await createWallet(pool, 1000n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const operationId = `${ids.key}-shared-command`;
      await app.settle.execute({ operationId, reservationId: reservation.reservationId, credits: 72n });
      await expect(app.release.execute({ operationId, reservationId: reservation.reservationId, credits: 28n }))
        .rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(900n);
      expect(state.settled).toBe(72n);
      expect(state.refunds).toBe(0n);
      expect(state.released).toBe(0n);
      expect(await countOperations(pool, reservation.reservationId)).toBe(1);
    } finally { await cleanup(pool, ids); }
  });

  it('replays one settle result for twenty concurrent duplicate callbacks', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const results = await Promise.all(Array.from({ length: 20 }, () =>
        app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 72n })));
      expect(results.filter((result) => !result.reused)).toHaveLength(1);
      expect(results.filter((result) => result.reused)).toHaveLength(19);
      const state = await snapshot(pool, ids.walletId);
      expect(state.settled).toBe(72n);
      expect(state.walletBalance).toBe(0n);
      expect(await countOperations(pool, reservation.reservationId)).toBe(1);
    } finally { await cleanup(pool, ids); }
  });

  it('replays one release result for twenty concurrent duplicate callbacks', async () => {
    const ids = await createWallet(pool, 1000n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 72n });
      const results = await Promise.all(Array.from({ length: 20 }, () =>
        app.release.execute({ operationId: `${ids.key}-release`, reservationId: reservation.reservationId, credits: 28n })));
      expect(results.filter((result) => !result.reused)).toHaveLength(1);
      expect(results.filter((result) => result.reused)).toHaveLength(19);
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(928n);
      expect(state.refunds).toBe(28n);
      expect(await count(pool, 'ledger_entries', ids.walletId, "type='REFUND'")).toBe(1);
      expect(await countOperations(pool, reservation.reservationId)).toBe(2);
    } finally { await cleanup(pool, ids); }
  });

  it('maps a concurrent same-key race across wallets to a typed conflict', async () => {
    const first = await createWallet(pool, 100n);
    const second = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const results = await Promise.allSettled([
        app.reserve.execute({ operationId: `${first.key}-shared`, walletId: first.walletId, credits: 40n }),
        app.reserve.execute({ operationId: `${first.key}-shared`, walletId: second.walletId, credits: 40n }),
      ]);
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((result) => result.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
      expect((await snapshot(pool, first.walletId)).spend + (await snapshot(pool, second.walletId)).spend).toBe(40n);
    } finally {
      await cleanup(pool, first);
      await cleanup(pool, second);
    }
  });
});
