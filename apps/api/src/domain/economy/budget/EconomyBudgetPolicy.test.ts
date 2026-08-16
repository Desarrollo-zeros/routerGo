import { describe, expect, it } from 'vitest';
import {
  BudgetDecision,
  EconomyBudgetPolicy,
  EconomicAmount,
  createBudgetSnapshot,
  createBudgetUsage,
  createRevenueFunding,
  createScope,
} from './EconomyBudgetPolicy.js';

const policy = new EconomyBudgetPolicy();
const usd = (value: bigint) => EconomicAmount.of(value, 'USD_MICRO');
const credits = (value: bigint) => EconomicAmount.of(value, 'CREDITS');
const providerScope = createScope('PROVIDER', 'provider-a');
const budget = (overrides: Partial<Parameters<typeof createBudgetSnapshot>[0]> = {}) => createBudgetSnapshot({
  id: 'budget-1',
  scope: providerScope,
  limit: usd(1000n),
  startsAt: new Date('2030-01-01T00:00:00Z'),
  endsAt: new Date('2030-02-01T00:00:00Z'),
  ...overrides,
});
const usage = (actual: bigint, committed: bigint, unit: 'USD_MICRO' | 'CREDITS' = 'USD_MICRO') =>
  createBudgetUsage(EconomicAmount.of(actual, unit), EconomicAmount.of(committed, unit));
const evaluate = (overrides: Partial<Parameters<typeof policy.evaluate>[0]> = {}) => policy.evaluate({
  budget: budget(),
  scope: providerScope,
  requested: usd(100n),
  usage: usage(100n, 100n),
  now: new Date('2030-01-15T00:00:00Z'),
  circuit: { state: 'CLOSED', spendingEnabled: true },
  ...overrides,
});

function expectReason(result: BudgetDecision, reason: BudgetDecision['reason']) {
  expect(result.allowed).toBe(false);
  expect(result.reason).toBe(reason);
}

describe('EconomyBudgetPolicy', () => {
  it('allows active scoped spend with enough remaining budget', () => {
    expect(evaluate()).toMatchObject({ allowed: true, reason: 'ALLOWED', remainingAmount: 800n });
  });

  it('denies missing, inactive, and mismatched budgets', () => {
    expectReason(evaluate({ budget: null }), 'NO_APPLICABLE_BUDGET');
    expectReason(evaluate({ now: new Date('2030-02-01T00:00:00Z') }), 'OUTSIDE_BUDGET_PERIOD');
    expectReason(evaluate({ scope: createScope('PROVIDER', 'provider-b') }), 'SCOPE_MISMATCH');
    expectReason(evaluate({ budget: budget({ scope: createScope('GLOBAL') }), scope: providerScope }), 'SCOPE_MISMATCH');
  });

  it('allows exact start but excludes exact end', () => {
    expect(evaluate({ now: new Date('2030-01-01T00:00:00Z') }).allowed).toBe(true);
    expect(evaluate({ now: new Date('2030-02-01T00:00:00Z') }).allowed).toBe(false);
  });

  it('denies exhausted and oversubscribed budgets but allows exact remaining', () => {
    expectReason(evaluate({ usage: usage(900n, 100n) }), 'BUDGET_EXHAUSTED');
    expectReason(evaluate({ requested: usd(801n) }), 'REQUEST_EXCEEDS_REMAINING');
    expect(evaluate({ requested: usd(800n) }).allowed).toBe(true);
  });

  it('rejects zero, negative, and cross-unit requests', () => {
    expectReason(evaluate({ requested: usd(0n) }), 'INVALID_REQUEST');
    expectReason(evaluate({ requested: EconomicAmount.of(-1n, 'USD_MICRO') }), 'INVALID_REQUEST');
    expectReason(evaluate({ requested: credits(1n) }), 'INVALID_UNIT');
  });

  it('denies when the economic circuit is open or spending is disabled', () => {
    expectReason(evaluate({ circuit: { state: 'OPEN', spendingEnabled: true } }), 'ECONOMIC_CIRCUIT_OPEN');
    expectReason(evaluate({ circuit: { state: 'CLOSED', spendingEnabled: false } }), 'SPENDING_DISABLED');
  });

  it('requires finalized revenue for ad-funded compute', () => {
    const adScope = createScope('AD_FUNDED_COMPUTE', 'compute-a');
    const adBudget = budget({ scope: adScope, limit: usd(1000n) });
    const noFunding = createRevenueFunding(50n, 400n, 100n, 0n);
    const enoughFunding = createRevenueFunding(200n, 400n, 100n, 0n);

    expectReason(evaluate({ budget: adBudget, scope: adScope, funding: noFunding }), 'INSUFFICIENT_FINALIZED_REVENUE');
    expect(evaluate({ budget: adBudget, scope: adScope, funding: enoughFunding }).allowed).toBe(true);
  });

  it('preserves exact bigint arithmetic beyond safe integer range', () => {
    const limit = 900719925474099312345n;
    const result = evaluate({
      budget: budget({ limit: usd(limit) }),
      requested: usd(2n),
      usage: usage(limit - 3n, 1n),
    });

    expect(result.allowed).toBe(true);
    expect(result.remainingAmount).toBe(2n);
  });
});
