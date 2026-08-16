import { describe, expect, it } from 'vitest';
import { createContext } from './credit-operations.test-support';

describe('credit reservation application operations', () => {
  it('reserves available credits and records one spend', async () => {
    const context = createContext(100n);
    const result = await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 80n });

    expect(result.walletBalance).toBe(20n);
    expect(context.state.ledgers).toHaveLength(1);
    expect(context.state.ledgers[0].toProps().amount.toString()).toBe('80');
    expect(context.state.ledgers[0].kind).toBe('spend');
  });

  it('rejects insufficient balance without reservation or ledger effects', async () => {
    const context = createContext(50n);

    await expect(context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 80n }))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' });
    expect(context.walletBalance()).toBe(50n);
    expect(context.state.reservations.size).toBe(0);
    expect(context.state.ledgers).toHaveLength(0);
  });

  it('reuses an identical reserve operation without a second debit', async () => {
    const context = createContext(100n);
    const input = { operationId: 'reserve-1', walletId: 'wallet-1', credits: 80n };

    await context.reserve.execute(input);
    const reused = await context.reserve.execute(input);

    expect(reused.reused).toBe(true);
    expect(context.walletBalance()).toBe(20n);
    expect(context.state.reservations.size).toBe(1);
    expect(context.state.ledgers).toHaveLength(1);
  });

  it('rejects a reserve retry that changes the amount', async () => {
    const context = createContext(100n);
    await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 80n });

    await expect(context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 70n }))
      .rejects.toMatchObject({ code: 'DUPLICATE_OPERATION' });
  });

  it('settles partially without charging the wallet again', async () => {
    const context = createContext(100n);
    const reservation = await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 100n });

    const result = await context.settle.execute({ operationId: 'settle-1', reservationId: reservation.reservationId, credits: 72n });

    expect(result.settledCredits).toBe(72n);
    expect(result.remainingCredits).toBe(28n);
    expect(result.status).toBe('RESERVED');
    expect(context.walletBalance()).toBe(0n);
  });

  it('rejects settlement above remaining credits and preserves state', async () => {
    const context = createContext(100n);
    const reservation = await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 100n });

    await expect(context.settle.execute({ operationId: 'settle-1', reservationId: reservation.reservationId, credits: 101n }))
      .rejects.toMatchObject({ code: 'SETTLEMENT_EXCEEDS_REMAINING' });
    expect(context.walletBalance()).toBe(0n);
    expect(context.reservation(reservation.reservationId).settledCredits.value).toBe(0n);
  });

  it('releases unused credits back to the wallet', async () => {
    const context = createContext(1000n);
    const reservation = await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 100n });
    await context.settle.execute({ operationId: 'settle-1', reservationId: reservation.reservationId, credits: 72n });

    const result = await context.release.execute({ operationId: 'release-1', reservationId: reservation.reservationId, credits: 28n });

    expect(result.status).toBe('RELEASED');
    expect(result.remainingCredits).toBe(0n);
    expect(context.walletBalance()).toBe(928n);
    expect(context.state.ledgers.map((entry) => entry.kind)).toEqual(['spend', 'refund']);
  });

  it('rejects release above remaining credits', async () => {
    const context = createContext(100n);
    const reservation = await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 100n });

    await expect(context.release.execute({ operationId: 'release-1', reservationId: reservation.reservationId, credits: 101n }))
      .rejects.toMatchObject({ code: 'RELEASE_EXCEEDS_REMAINING' });
    expect(context.walletBalance()).toBe(0n);
  });

  it('releases an expired reservation when the domain permits it', async () => {
    const context = createContext(100n);
    const reservation = await context.reserve.execute({
      operationId: 'reserve-1', walletId: 'wallet-1', credits: 100n, expiresAt: new Date('2029-12-31T00:00:00Z'),
    });
    const aggregate = context.reservation(reservation.reservationId);
    aggregate.expire(new Date('2030-01-01T00:00:00Z'));

    const result = await context.release.execute({ operationId: 'release-1', reservationId: reservation.reservationId, credits: 100n });

    expect(result.status).toBe('RELEASED');
    expect(context.walletBalance()).toBe(100n);
  });

  it('rejects settlement after a reservation is fully released', async () => {
    const context = createContext(100n);
    const reservation = await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 100n });
    await context.release.execute({ operationId: 'release-1', reservationId: reservation.reservationId, credits: 100n });

    await expect(context.settle.execute({ operationId: 'settle-1', reservationId: reservation.reservationId, credits: 1n }))
      .rejects.toMatchObject({ code: 'INVALID_RESERVATION_STATE' });
  });

  it('rolls back wallet and reservation when ledger persistence fails', async () => {
    const context = createContext(100n);
    context.failLedgerInsert = true;

    await expect(context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 80n }))
      .rejects.toMatchObject({ code: 'TRANSACTION_FAILED' });
    expect(context.walletBalance()).toBe(100n);
    expect(context.state.reservations.size).toBe(0);
    expect(context.state.ledgers).toHaveLength(0);
  });

  it('preserves large bigint credits without conversion', async () => {
    const context = createContext(900719925474099312345n);
    const result = await context.reserve.execute({
      operationId: 'reserve-large', walletId: 'wallet-1', credits: 900719925474099312344n,
    });

    expect(result.walletBalance).toBe(1n);
  });

  it('reuses settle and release independently without duplicate effects', async () => {
    const context = createContext(1000n);
    const reservation = await context.reserve.execute({ operationId: 'reserve-1', walletId: 'wallet-1', credits: 100n });
    const settleInput = { operationId: 'settle-1', reservationId: reservation.reservationId, credits: 72n };
    const releaseInput = { operationId: 'release-1', reservationId: reservation.reservationId, credits: 28n };

    await context.settle.execute(settleInput);
    const settleRetry = await context.settle.execute(settleInput);
    await context.release.execute(releaseInput);
    const releaseRetry = await context.release.execute(releaseInput);

    expect(settleRetry.reused).toBe(true);
    expect(releaseRetry.reused).toBe(true);
    expect(context.walletBalance()).toBe(928n);
    expect(context.state.ledgers).toHaveLength(2);
  });
});
