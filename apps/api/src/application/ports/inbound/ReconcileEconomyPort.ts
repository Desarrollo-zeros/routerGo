export interface ReconcileEconomyInput {
  limit?: number;
}

export interface ReconcileEconomyOutput {
  providerCosts: number;
  revenues: number;
  reconciliationRequiredRuns: number;
}

export interface ReconcileEconomyPort {
  execute(input?: ReconcileEconomyInput): Promise<ReconcileEconomyOutput>;
}
