export type RiskSignalInput = {
  currentScore: number;
  duplicateCount: number;
  replayDetected: boolean;
  velocityPerMinute: number;
  severity: number;
};

export type RiskPolicyConfig = {
  reviewThreshold: number;
  blockThreshold: number;
  duplicateWeight: number;
  replayWeight: number;
  velocityWeight: number;
};

export type RiskDecision = { score: number; action: 'NORMAL' | 'REVIEW' | 'BLOCKED'; reason: 'NO_SIGNAL' | 'RISK_SIGNALS' | 'BLOCK_THRESHOLD' };

export function evaluateRiskSignals(input: RiskSignalInput, config: RiskPolicyConfig): RiskDecision {
  const delta = signalDelta(input, config);
  const score = Math.min(100, Math.max(0, input.currentScore + delta));
  if (score >= config.blockThreshold) return { score, action: 'BLOCKED', reason: 'BLOCK_THRESHOLD' };
  if (score >= config.reviewThreshold) return { score, action: 'REVIEW', reason: 'RISK_SIGNALS' };
  return { score, action: 'NORMAL', reason: delta > 0 ? 'RISK_SIGNALS' : 'NO_SIGNAL' };
}

function signalDelta(input: RiskSignalInput, config: RiskPolicyConfig): number {
  const duplicate = Math.max(0, input.duplicateCount) * config.duplicateWeight;
  const replay = input.replayDetected ? config.replayWeight : 0;
  const velocity = Math.max(0, input.velocityPerMinute) * config.velocityWeight;
  return duplicate + replay + velocity + Math.max(0, input.severity);
}
