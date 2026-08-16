import type { AdCandidate, AdDecision, AdInventoryKind } from '../../../domain/ads/AdDecision.js';
import type { AdEligibilityRequest } from '../../../domain/ads/AdEligibilityPolicy.js';
import type { AdEligibilityGate } from './AdEligibilityTelemetry.js';

export type AdDecisionRequest = {
  placementKey: string;
  candidates: readonly AdCandidate[];
  allowedInventories?: readonly AdInventoryKind[];
  eligibility?: AdEligibilityContext;
};

export type AdEligibilityContext = AdEligibilityRequest & { eventKey: string; id: string; placementId?: string };

export interface AdDecisionPort {
  decide(request: AdDecisionRequest): Promise<AdDecision>;
}

export interface AdInventoryStrategy {
  readonly inventory: AdInventoryKind;
  select(candidates: readonly AdCandidate[]): AdCandidate | null;
}
