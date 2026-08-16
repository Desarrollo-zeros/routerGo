import type { AdDecisionPort } from '../ports/outbound/AdDecisionPort.js';
import type { AdCandidateReader } from '../ports/outbound/AdCandidateReader.js';

export type PublicAd = {
  outcome: 'SELECTED' | 'NO_FILL';
  placementKey: string;
  reason: 'SELECTED' | 'NO_ELIGIBLE_CANDIDATE';
  sponsoredLabel?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  clickUrl?: string;
};

export class GetPublicAd {
  constructor(private readonly candidates: AdCandidateReader, private readonly decision: AdDecisionPort) {}

  async execute(placementKey: string): Promise<PublicAd> {
    const decision = await this.decision.decide({ placementKey, candidates: await this.candidates.listForPlacement(placementKey) });
    const candidate = decision.candidate;
    return {
      outcome: decision.outcome, placementKey, reason: decision.reason,
      sponsoredLabel: candidate?.sponsoredLabel, title: candidate?.payload.title,
      body: candidate?.payload.body, imageUrl: candidate?.payload.imageUrl, clickUrl: candidate?.payload.clickUrl,
    };
  }
}
