export type LocationReviewState = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type LocationReviewCommand = 'SUBMIT' | 'APPROVE' | 'REJECT';
export type LocationReviewResult = { state: LocationReviewState; reason?: 'REVIEW_REQUIRED' | 'ALREADY_FINAL' };

export type LocationPermissionDecision = 'GRANTED' | 'DENIED';
export type LocationProofMode = 'LOCATION_PROOF' | 'ALTERNATIVE_PROOF' | 'UNAVAILABLE';

export function transitionLocationReview(state: LocationReviewState, command: LocationReviewCommand): LocationReviewResult {
  if (state === 'DRAFT' && command === 'SUBMIT') return { state: 'SUBMITTED' };
  if (state === 'SUBMITTED' && command === 'APPROVE') return { state: 'APPROVED' };
  if (state === 'SUBMITTED' && command === 'REJECT') return { state: 'REJECTED' };
  if (state === 'APPROVED' || state === 'REJECTED') return { state, reason: 'ALREADY_FINAL' };
  return { state, reason: 'REVIEW_REQUIRED' };
}

export function resolveLocationPermission(permission: LocationPermissionDecision, alternativeAvailable: boolean): { mode: LocationProofMode } {
  if (permission === 'GRANTED') return { mode: 'LOCATION_PROOF' };
  return alternativeAvailable ? { mode: 'ALTERNATIVE_PROOF' } : { mode: 'UNAVAILABLE' };
}
