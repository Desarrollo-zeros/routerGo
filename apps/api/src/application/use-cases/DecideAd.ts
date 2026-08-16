import type { AdDecisionPort, AdDecisionRequest, AdInventoryStrategy } from '../ports/outbound/AdDecisionPort.js';
import type { AdEligibilityGate } from '../ports/outbound/AdEligibilityTelemetry.js';
import { noFill, selectedAd } from '../../domain/ads/AdDecision.js';

export class DecideAd implements AdDecisionPort {
  constructor(private readonly strategies: readonly AdInventoryStrategy[], private readonly eligibility?: AdEligibilityGate) {}

  async decide(request: AdDecisionRequest) {
    const allowed = request.allowedInventories ?? this.strategies.map((strategy) => strategy.inventory);
    for (const strategy of this.strategies) {
      if (!allowed.includes(strategy.inventory)) continue;
      const candidate = await selectEligible(strategy, request, this.eligibility);
      if (candidate) return selectedAd(candidate);
    }
    return noFill();
  }
}

async function selectEligible(strategy: AdInventoryStrategy, request: AdDecisionRequest, gate?: AdEligibilityGate) {
  let remaining = request.candidates;
  while (remaining.length > 0) {
    const candidate = strategy.select(remaining);
    if (!candidate) return null;
    if (!gate || !request.eligibility) return candidate;
    const context = request.eligibility;
    const result = await gate.execute({ ...context, campaignId: candidate.campaignId, id: `${context.id}:${candidate.campaignId}`, eventKey: `${context.eventKey}:${candidate.campaignId}` });
    if (result.decision.allowed) return candidate;
    remaining = remaining.filter((item) => item !== candidate);
  }
  return null;
}
