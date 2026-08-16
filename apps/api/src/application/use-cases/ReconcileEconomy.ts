import type { ReconcileEconomyInput, ReconcileEconomyOutput, ReconcileEconomyPort } from '../ports/inbound/ReconcileEconomyPort';

export interface EconomyReconciliationRepository {
  reconcileProviderCosts(limit: number): Promise<number>;
  reconcileFinalizedRevenue(limit: number): Promise<number>;
  countReconciliationRequiredRuns(): Promise<number>;
}

export interface EconomyReconciliationMetrics {
  recordRun(): void;
  recordProviderCosts(count: number): void;
  recordRevenue(count: number): void;
  setReconciliationRequiredRuns(count: number): void;
  recordFailure(): void;
}

export class ReconcileEconomyUseCase implements ReconcileEconomyPort {
  constructor(
    private readonly repository: EconomyReconciliationRepository,
    private readonly metrics: EconomyReconciliationMetrics,
  ) {}

  async execute(input: ReconcileEconomyInput = {}): Promise<ReconcileEconomyOutput> {
    const limit = normalizeLimit(input.limit);
    this.metrics.recordRun();
    try {
      const providerCosts = await this.repository.reconcileProviderCosts(limit);
      const revenues = await this.repository.reconcileFinalizedRevenue(limit);
      const reconciliationRequiredRuns = await this.repository.countReconciliationRequiredRuns();
      this.metrics.recordProviderCosts(providerCosts);
      this.metrics.recordRevenue(revenues);
      this.metrics.setReconciliationRequiredRuns(reconciliationRequiredRuns);
      return { providerCosts, revenues, reconciliationRequiredRuns };
    } catch (error) {
      this.metrics.recordFailure();
      throw error;
    }
  }
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) return 100;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('InvalidReconciliationLimit');
  return limit;
}
