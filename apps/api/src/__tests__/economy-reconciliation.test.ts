import { describe, expect, it } from 'vitest';
import { ReconcileEconomyUseCase } from '../application/use-cases/ReconcileEconomy';

describe('ReconcileEconomyUseCase', () => {
  it('reconciles both ledgers and exposes unresolved runs', async () => {
    const calls: string[] = [];
    const useCase = new ReconcileEconomyUseCase({
      reconcileProviderCosts: async (limit) => { calls.push(`cost:${limit}`); return 2; },
      reconcileFinalizedRevenue: async (limit) => { calls.push(`revenue:${limit}`); return 1; },
      countReconciliationRequiredRuns: async () => 3,
    }, {
      recordRun: () => calls.push('run'), recordProviderCosts: (count) => calls.push(`costs:${count}`),
      recordRevenue: (count) => calls.push(`revenues:${count}`), setReconciliationRequiredRuns: (count) => calls.push(`required:${count}`), recordFailure: () => calls.push('failure'),
    });
    await expect(useCase.execute({ limit: 10 })).resolves.toEqual({ providerCosts: 2, revenues: 1, reconciliationRequiredRuns: 3 });
    expect(calls).toEqual(['run', 'cost:10', 'revenue:10', 'costs:2', 'revenues:1', 'required:3']);
  });

  it('rejects unsafe batch limits and records failures', async () => {
    const calls: string[] = [];
    const useCase = new ReconcileEconomyUseCase({
      reconcileProviderCosts: async () => { throw new Error('db'); }, reconcileFinalizedRevenue: async () => 0, countReconciliationRequiredRuns: async () => 0,
    }, { recordRun: () => {}, recordProviderCosts: () => {}, recordRevenue: () => {}, setReconciliationRequiredRuns: () => {}, recordFailure: () => calls.push('failure') });
    await expect(useCase.execute({ limit: 0 })).rejects.toThrow('InvalidReconciliationLimit');
    await expect(useCase.execute()).rejects.toThrow('db');
    expect(calls).toEqual(['failure']);
  });
});
