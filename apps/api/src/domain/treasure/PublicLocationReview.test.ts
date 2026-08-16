import { describe, expect, it } from 'vitest';
import { resolveLocationPermission, transitionLocationReview } from './PublicLocationReview.js';

describe('PublicLocationReview', () => {
  it('requires submission before approval and rejects unsafe locations', () => {
    expect(transitionLocationReview('DRAFT', 'APPROVE')).toEqual({ state: 'DRAFT', reason: 'REVIEW_REQUIRED' });
    expect(transitionLocationReview('DRAFT', 'SUBMIT')).toEqual({ state: 'SUBMITTED' });
    expect(transitionLocationReview('SUBMITTED', 'APPROVE')).toEqual({ state: 'APPROVED' });
    expect(transitionLocationReview('SUBMITTED', 'REJECT')).toEqual({ state: 'REJECTED' });
  });

  it('offers a non-location alternative when permission is denied', () => {
    expect(resolveLocationPermission('GRANTED', true)).toEqual({ mode: 'LOCATION_PROOF' });
    expect(resolveLocationPermission('DENIED', true)).toEqual({ mode: 'ALTERNATIVE_PROOF' });
    expect(resolveLocationPermission('DENIED', false)).toEqual({ mode: 'UNAVAILABLE' });
  });
});
