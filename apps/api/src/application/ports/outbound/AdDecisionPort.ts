import type { AdCandidate, AdDecision, AdInventoryKind } from '../../../domain/ads/AdDecision.js';

export type AdDecisionRequest = {
  placementKey: string;
  candidates: readonly AdCandidate[];
  allowedInventories?: readonly AdInventoryKind[];
};

export interface AdDecisionPort {
  decide(request: AdDecisionRequest): Promise<AdDecision>;
}

export interface AdInventoryStrategy {
  readonly inventory: AdInventoryKind;
  select(candidates: readonly AdCandidate[]): AdCandidate | null;
}
