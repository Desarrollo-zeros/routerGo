import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanup,
  createWallet,
  deleteReservation,
  insertReservationBlocker,
  operations,
  snapshot,
  countOperations,
} from './economy-operations.integration.support';
import { installOperationInsertFailure } from './economy-faults.integration.support';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo',
  max: 12,
});

describe.sequential('T024 PostgreSQL rollback and retry', () => {
  beforeAll(async () => { await pool.query('SELECT 1'); });
  afterAll(async () => { await pool.end(); });

  it('rolls back reserve failure and accepts the same operation on retry', async () => {
    const ids = await createWallet(pool, 100n);
    const reservationId = `${ids.key}-blocked-reservation`;
    try {
      await insertReservationBlocker(pool, ids.walletId, reservationId);
      const app = operations(pool);
      const input = { operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 80n, reservationId };
      await expect(app.reserve.execute(input)).rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
      await deleteReservation(pool, reservationId);
      const result = await app.reserve.execute(input);
      expect(result.reused).toBe(false);
      const state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(20n);
      expect(state.spend).toBe(80n);
      expect(state.reservationCount).toBe(1n);
    } finally { await cleanup(pool, ids); }
  });

  it('rolls back settle failure and accepts the same callback on retry', async () => {
    const ids = await createWallet(pool, 100n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      const operationId = `${ids.key}-settle`;
      const removeFailure = await installOperationInsertFailure(pool, operationId);
      try {
        await expect(app.settle.execute({ operationId, reservationId: reservation.reservationId, credits: 72n }))
          .rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
      } finally { await removeFailure(); }
      expect((await snapshot(pool, ids.walletId)).settled).toBe(0n);
      expect(await countOperations(pool, reservation.reservationId)).toBe(0);
      await app.settle.execute({ operationId, reservationId: reservation.reservationId, credits: 72n });
      expect((await snapshot(pool, ids.walletId)).settled).toBe(72n);
    } finally { await cleanup(pool, ids); }
  });

  it('rolls back release failure and accepts the same callback on retry', async () => {
    const ids = await createWallet(pool, 1000n);
    try {
      const app = operations(pool);
      const reservation = await app.reserve.execute({ operationId: `${ids.key}-reserve`, walletId: ids.walletId, credits: 100n });
      await app.settle.execute({ operationId: `${ids.key}-settle`, reservationId: reservation.reservationId, credits: 72n });
      const operationId = `${ids.key}-release`;
      const removeFailure = await installOperationInsertFailure(pool, operationId);
      try {
        await expect(app.release.execute({ operationId, reservationId: reservation.reservationId, credits: 28n }))
          .rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
      } finally { await removeFailure(); }
      let state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(900n);
      expect(state.released).toBe(0n);
      expect(state.refunds).toBe(0n);
      expect(await countOperations(pool, reservation.reservationId)).toBe(1);
      await app.release.execute({ operationId, reservationId: reservation.reservationId, credits: 28n });
      state = await snapshot(pool, ids.walletId);
      expect(state.walletBalance).toBe(928n);
      expect(state.released).toBe(28n);
      expect(state.refunds).toBe(28n);
      expect(await countOperations(pool, reservation.reservationId)).toBe(2);
    } finally { await cleanup(pool, ids); }
  });
});
