export interface UnitEconomicsInput {
  revenueMicro: number;
  providerCostMicro: number;
  infraCostMicro: number;
  rewardLiabilityCredits: number;
}

export interface UnitEconomicsSummary extends UnitEconomicsInput {
  contributionMicro: number;
}

export function calculateUnitEconomics(input: UnitEconomicsInput): UnitEconomicsSummary {
  const revenueMicro = nonNegative(input.revenueMicro);
  const providerCostMicro = nonNegative(input.providerCostMicro);
  const infraCostMicro = nonNegative(input.infraCostMicro);
  const rewardLiabilityCredits = nonNegative(input.rewardLiabilityCredits);
  return { revenueMicro, providerCostMicro, infraCostMicro, rewardLiabilityCredits, contributionMicro: revenueMicro - providerCostMicro - infraCostMicro };
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
