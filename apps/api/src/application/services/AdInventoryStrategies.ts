import type { AdCandidate, AdInventoryKind } from '../../domain/ads/AdDecision.js';
import { isEligibleAd } from '../../domain/ads/AdDecision.js';
import type { AdInventoryStrategy } from '../ports/outbound/AdDecisionPort.js';

abstract class FirstEligibleStrategy implements AdInventoryStrategy {
  abstract readonly inventory: AdInventoryKind;

  select(candidates: readonly AdCandidate[]): AdCandidate | null {
    return candidates.find((candidate) => candidate.inventory === this.inventory && isEligibleAd(candidate)) ?? null;
  }
}

export class DirectInventoryStrategy extends FirstEligibleStrategy {
  readonly inventory = 'DIRECT' as const;
}

export class ThirdPartyInventoryStrategy extends FirstEligibleStrategy {
  readonly inventory = 'THIRD_PARTY' as const;
}

export class HouseInventoryStrategy extends FirstEligibleStrategy {
  readonly inventory = 'HOUSE' as const;
}
