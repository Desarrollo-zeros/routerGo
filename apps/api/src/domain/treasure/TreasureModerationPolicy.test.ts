import { describe, expect, it } from 'vitest';
import { reviewTreasureHunt, type TreasureHuntReview } from './TreasureModerationPolicy.js';

const config = { allowedLocationKinds: ['PARK', 'LIBRARY'], minRadiusMeters: 100, maxRadiusMeters: 1000 } as const;

function valid(): TreasureHuntReview {
  return {
    title: 'City clues',
    publicLocationReviewed: true,
    steps: [{ sequence: 1, proof: 'COARSE_GEOFENCE', locationKind: 'PARK', geohash: '9q8yy', radiusMeters: 250 }],
  };
}

describe('TreasureModerationPolicy', () => {
  it('approves a reviewed public location with coarse proof', () => {
    expect(reviewTreasureHunt(valid(), config)).toEqual({ approved: true, reason: 'APPROVED' });
  });

  it('rejects private or unreviewed locations and precise geofences', () => {
    expect(reviewTreasureHunt({ ...valid(), publicLocationReviewed: false }, config).approved).toBe(false);
    expect(reviewTreasureHunt({ ...valid(), steps: [{ ...valid().steps[0], locationKind: 'PRIVATE_HOME' }] }, config).reason).toBe('LOCATION_NOT_ALLOWED');
    expect(reviewTreasureHunt({ ...valid(), steps: [{ ...valid().steps[0], geohash: '9q8yyz123' }] }, config).reason).toBe('LOCATION_TOO_PRECISE');
    expect(reviewTreasureHunt({ ...valid(), steps: [{ ...valid().steps[0], geohash: undefined }] }, config).reason).toBe('STEP_INVALID');
  });
});
