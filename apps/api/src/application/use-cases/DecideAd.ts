import type { AdDecisionPort, AdDecisionRequest, AdInventoryStrategy } from '../ports/outbound/AdDecisionPort.js';
import { noFill, selectedAd } from '../../domain/ads/AdDecision.js';

export class DecideAd implements AdDecisionPort {
  constructor(private readonly strategies: readonly AdInventoryStrategy[]) {}

  async decide(request: AdDecisionRequest) {
    const allowed = request.allowedInventories ?? this.strategies.map((strategy) => strategy.inventory);
    for (const strategy of this.strategies) {
      if (!allowed.includes(strategy.inventory)) continue;
      const candidate = strategy.select(request.candidates);
      if (candidate) return selectedAd(candidate);
    }
    return noFill();
  }
}
