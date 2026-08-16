export type AdInventoryKind = 'DIRECT' | 'THIRD_PARTY' | 'HOUSE';

export type AdCandidate = {
  campaignId: string;
  creativeId: string;
  inventory: AdInventoryKind;
  campaignStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  moderationStatus: 'APPROVED' | 'REJECTED' | 'DRAFT' | 'REVIEW';
  sponsoredLabel: string;
  payload: Record<string, string>;
};

export type AdDecision = {
  outcome: 'SELECTED' | 'NO_FILL';
  inventory: AdInventoryKind | null;
  candidate: AdCandidate | null;
  reason: 'SELECTED' | 'NO_ELIGIBLE_CANDIDATE';
};

export const selectedAd = (candidate: AdCandidate): AdDecision => ({
  outcome: 'SELECTED', inventory: candidate.inventory, candidate, reason: 'SELECTED',
});

export const noFill = (): AdDecision => ({
  outcome: 'NO_FILL', inventory: null, candidate: null, reason: 'NO_ELIGIBLE_CANDIDATE',
});

export const isEligibleAd = (candidate: AdCandidate): boolean => (
  candidate.campaignStatus === 'ACTIVE'
  && candidate.moderationStatus === 'APPROVED'
  && candidate.sponsoredLabel.trim().length > 0
);
