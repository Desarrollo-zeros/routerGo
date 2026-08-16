import type { AdCandidate } from '../../../domain/ads/AdDecision.js';

export interface AdCandidateReader {
  listForPlacement(placementKey: string): Promise<AdCandidate[]>;
}
