import { describe, expect, it } from 'vitest';
import { CreditReservation } from './CreditReservation.js';
import { CreditReservationError } from './CreditReservationError.js';

const base = {
  reservationId: 'reservation-1',
  walletId: 'wallet-1',
  operationId: 'operation-1',
  reservedCredits: 100n,
  settledCredits: 30n,
  releasedCredits: 20n,
  createdAt: new Date('2030-01-01T00:00:00Z'),
};

describe('CreditReservation rehydration', () => {
  it('rebuilds a valid partial reservation', () => {
    const reservation = CreditReservation.rehydrate({ ...base, status: 'RESERVED' });

    expect(reservation.remainingCredits.value).toBe(50n);
    expect(reservation.operationId).toBe('operation-1');
  });

  it.each([
    { status: 'SETTLED' as const, settledCredits: 30n, releasedCredits: 0n },
    { status: 'RELEASED' as const, settledCredits: 0n, releasedCredits: 20n },
    { status: 'EXPIRED' as const, settledCredits: 100n, releasedCredits: 0n },
    { status: 'CANCELLED' as const, settledCredits: 0n, releasedCredits: 20n },
  ])('rejects impossible $status state', (state) => {
    expect(() => CreditReservation.rehydrate({ ...base, ...state })).toThrowError(CreditReservationError);
  });

  it('rehydrates a fully settled or released terminal state', () => {
    const settled = CreditReservation.rehydrate({ ...base, settledCredits: 100n, releasedCredits: 0n, status: 'SETTLED' });
    const released = CreditReservation.rehydrate({ ...base, settledCredits: 30n, releasedCredits: 70n, status: 'RELEASED' });

    expect(settled.remainingCredits.value).toBe(0n);
    expect(released.remainingCredits.value).toBe(0n);
  });
});
