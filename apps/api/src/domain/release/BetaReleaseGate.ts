export interface BetaReleaseInput {
  requiredFlagsEnabled: boolean;
  economyCircuitClosed: boolean;
  rollbackVerified: boolean;
  regressionSuitePassed: boolean;
}

export type BetaReleaseDecision =
  | { ready: true; reason: 'READY' }
  | { ready: false; reason: 'FEATURE_FLAGS_NOT_READY' | 'ECONOMY_CIRCUIT_OPEN' | 'ROLLBACK_NOT_VERIFIED' | 'REGRESSION_FAILED' };

export function evaluateBetaRelease(input: BetaReleaseInput): BetaReleaseDecision {
  if (!input.requiredFlagsEnabled) return { ready: false, reason: 'FEATURE_FLAGS_NOT_READY' };
  if (!input.economyCircuitClosed) return { ready: false, reason: 'ECONOMY_CIRCUIT_OPEN' };
  if (!input.rollbackVerified) return { ready: false, reason: 'ROLLBACK_NOT_VERIFIED' };
  if (!input.regressionSuitePassed) return { ready: false, reason: 'REGRESSION_FAILED' };
  return { ready: true, reason: 'READY' };
}
