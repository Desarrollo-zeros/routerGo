import { describe, expect, it } from 'vitest';
import { CreditReservation } from './reservation/CreditReservation.js';
import {
  EconomyBudgetPolicy,
  EconomicAmount,
  createBudgetSnapshot,
  createBudgetUsage,
  createScope,
} from './budget/EconomyBudgetPolicy.js';

const policy = new EconomyBudgetPolicy();
const providerScope = createScope('PROVIDER', 'provider-a');
const budget = createBudgetSnapshot({
  id: 'budget-1',
  scope: providerScope,
  limit: EconomicAmount.of(1000n, 'USD_MICRO'),
  startsAt: new Date('2030-01-01T00:00:00Z'),
  endsAt: new Date('2030-02-01T00:00:00Z'),
});
const usage = createBudgetUsage(EconomicAmount.of(100n, 'USD_MICRO'), EconomicAmount.of(100n, 'USD_MICRO'));
const policyInput = {
  budget,
  scope: providerScope,
  usage,
  now: new Date('2030-01-15T00:00:00Z'),
  circuit: { state: 'CLOSED' as const, spendingEnabled: true },
};

function reservation() {
  return CreditReservation.create({
    reservationId: 'reservation-1', walletId: 'wallet-1', operationId: 'operation-1',
    reservedCredits: 100n, createdAt: new Date('2030-01-01T00:00:00Z'),
  });
}

describe('T021 + T022 economy boundaries', () => {
  it('supports settle actual usage followed by release of unused credits', () => {
    const value = reservation();

    value.settle(72n);
    expect(value.remainingCredits.value).toBe(28n);
    value.release(28n);

    expect(value.toSnapshot()).toMatchObject({ settledCredits: 72n, releasedCredits: 28n, status: 'RELEASED' });
  });

  it('keeps exact large GoCredits values across the boundary', () => {
    const value = CreditReservation.create({
      reservationId: 'large-reservation', walletId: 'wallet-1', operationId: 'large-operation',
      reservedCredits: 900719925474099312345n, createdAt: new Date('2030-01-01T00:00:00Z'),
    });

    value.settle(1n);
    expect(value.remainingCredits.value).toBe(900719925474099312344n);
  });

  it('approves platform USD spending without touching the credit reservation', () => {
    const value = reservation();
    const before = value.toSnapshot();
    const decision = policy.evaluate({ ...policyInput, requested: EconomicAmount.of(100n, 'USD_MICRO') });

    expect(decision.allowed).toBe(true);
    expect(value.toSnapshot()).toEqual(before);
  });

  it('rejects GoCredits when a USD budget is requested', () => {
    const decision = policy.evaluate({ ...policyInput, requested: EconomicAmount.of(1n, 'CREDITS') });

    expect(decision).toMatchObject({ allowed: false, reason: 'INVALID_UNIT' });
  });

  it('blocks spending with an open economic circuit and preserves reservation state', () => {
    const value = reservation();
    const before = value.toSnapshot();
    const decision = policy.evaluate({
      ...policyInput,
      requested: EconomicAmount.of(100n, 'USD_MICRO'),
      circuit: { state: 'OPEN', spendingEnabled: true },
    });

    expect(decision).toMatchObject({ allowed: false, reason: 'ECONOMIC_CIRCUIT_OPEN' });
    expect(value.toSnapshot()).toEqual(before);
  });

  it('does not mutate reservation state when budget evaluation fails', () => {
    const value = reservation();
    const before = value.toSnapshot();
    const decision = policy.evaluate({
      ...policyInput,
      requested: EconomicAmount.of(901n, 'USD_MICRO'),
    });

    expect(decision).toMatchObject({ allowed: false, reason: 'REQUEST_EXCEEDS_REMAINING' });
    expect(value.toSnapshot()).toEqual(before);
  });
});
