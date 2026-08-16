import { describe, expect, it } from 'vitest';
import { CreditReservation } from './CreditReservation.js';
import { CreditReservationError } from './CreditReservationError.js';
import { Credits } from '../../value-objects/Credits.js';

const createdAt = new Date('2030-01-01T00:00:00Z');

function createReservation(overrides: Partial<Parameters<typeof CreditReservation.create>[0]> = {}) {
  return CreditReservation.create({
    reservationId: 'reservation-1',
    walletId: 'wallet-1',
    operationId: 'operation-1',
    reservedCredits: 100n,
    createdAt,
    ...overrides,
  });
}

describe('CreditReservation', () => {
  it('creates a reservation with exact remaining credits', () => {
    const reservation = createReservation({ reservedCredits: 9007199254740993n });

    expect(reservation.remainingCredits.value).toBe(9007199254740993n);
    expect(reservation.status).toBe('RESERVED');
  });

  it.each([0n, -1n])('rejects reserved credits %s', (reservedCredits) => {
    expect(() => createReservation({ reservedCredits })).toThrowError(CreditReservationError);
  });

  it('allows partial settlement and closes when all credits settle', () => {
    const reservation = createReservation();

    reservation.settle(30n);
    expect(reservation.settledCredits.value).toBe(30n);
    expect(reservation.remainingCredits.value).toBe(70n);
    expect(reservation.status).toBe('RESERVED');

    reservation.settle(70n);
    expect(reservation.remainingCredits.value).toBe(0n);
    expect(reservation.status).toBe('SETTLED');
  });

  it('allows releasing unused credits after settlement', () => {
    const reservation = createReservation();

    reservation.settle(30n);
    reservation.release(70n);

    expect(reservation.releasedCredits.value).toBe(70n);
    expect(reservation.remainingCredits.value).toBe(0n);
    expect(reservation.status).toBe('RELEASED');
  });

  it('rejects zero, negative, and over-limit transitions', () => {
    const reservation = createReservation();

    expect(() => reservation.settle(0n)).toThrowError(CreditReservationError);
    expect(() => reservation.settle(-1n)).toThrowError(CreditReservationError);
    expect(() => reservation.settle(101n)).toThrowError(CreditReservationError);
    reservation.release(20n);
    expect(() => reservation.release(81n)).toThrowError(CreditReservationError);
  });

  it('rejects spending after a terminal state', () => {
    const settled = createReservation();
    settled.settle(100n);
    expect(() => settled.settle(1n)).toThrowError(CreditReservationError);
    expect(() => settled.release(1n)).toThrowError(CreditReservationError);

    const cancelled = createReservation();
    cancelled.cancel();
    expect(() => cancelled.settle(1n)).toThrowError(CreditReservationError);
    expect(() => cancelled.release(1n)).toThrowError(CreditReservationError);
  });

  it('keeps a mixed settle and release completion rehydratable', () => {
    const reservation = createReservation();

    reservation.release(40n);
    reservation.settle(60n);

    expect(reservation.status).toBe('RELEASED');
    expect(CreditReservation.rehydrate(reservation.toSnapshot()).status).toBe('RELEASED');
  });

  it('expires only after its deadline and permits release but never settlement', () => {
    const reservation = createReservation({ expiresAt: new Date('2030-01-02T00:00:00Z') });

    expect(() => reservation.expire(new Date('2030-01-01T23:59:59Z'))).toThrowError(CreditReservationError);
    reservation.expire(new Date('2030-01-02T00:00:00Z'));
    expect(reservation.status).toBe('EXPIRED');
    expect(() => reservation.settle(1n)).toThrowError(CreditReservationError);
    reservation.release(100n);
    expect(reservation.status).toBe('RELEASED');
  });

  it('accepts the canonical GoCredits value without converting through number', () => {
    const reservation = createReservation({ reservedCredits: 9007199254740993n });

    reservation.settle(Credits.of(1n));
    expect(reservation.remainingCredits.value).toBe(9007199254740992n);
  });
});
