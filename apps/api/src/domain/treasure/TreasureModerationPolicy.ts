export type TreasureProof = 'QR' | 'COARSE_GEOFENCE';
export type TreasureReviewReason = 'APPROVED' | 'INVALID_HUNT' | 'LOCATION_NOT_REVIEWED' | 'LOCATION_NOT_ALLOWED' | 'LOCATION_TOO_PRECISE' | 'RADIUS_INVALID' | 'STEP_INVALID';

export type TreasureStepReview = {
  sequence: number;
  proof: TreasureProof;
  locationKind: string;
  geohash?: string;
  radiusMeters?: number;
};

export type TreasureHuntReview = {
  title: string;
  publicLocationReviewed: boolean;
  steps: readonly TreasureStepReview[];
};

export type TreasureModerationConfig = {
  allowedLocationKinds: readonly string[];
  minRadiusMeters: number;
  maxRadiusMeters: number;
};

export type TreasureReviewDecision = { approved: boolean; reason: TreasureReviewReason };

export function reviewTreasureHunt(input: TreasureHuntReview, config: TreasureModerationConfig): TreasureReviewDecision {
  if (!input.title.trim() || input.steps.length === 0) return reject('INVALID_HUNT');
  if (!input.publicLocationReviewed) return reject('LOCATION_NOT_REVIEWED');
  for (const [index, step] of input.steps.entries()) {
    const reason = reviewStep(step, index + 1, config);
    if (reason) return reject(reason);
  }
  return { approved: true, reason: 'APPROVED' };
}

function reviewStep(step: TreasureStepReview, expectedSequence: number, config: TreasureModerationConfig): TreasureReviewReason | null {
  const shapeError = validateStepShape(step, expectedSequence);
  if (shapeError) return shapeError;
  if (!config.allowedLocationKinds.includes(step.locationKind)) return 'LOCATION_NOT_ALLOWED';
  if (hasPreciseGeohash(step.geohash)) return 'LOCATION_TOO_PRECISE';
  if (step.proof === 'COARSE_GEOFENCE') return validateGeofence(step, config);
  return null;
}

function validateStepShape(step: TreasureStepReview, expectedSequence: number): TreasureReviewReason | null {
  return step.sequence !== expectedSequence || !step.locationKind || !isProof(step.proof) ? 'STEP_INVALID' : null;
}

function hasPreciseGeohash(geohash: string | undefined): boolean {
  return Boolean(geohash && (geohash.length < 1 || geohash.length > 6));
}

function validateGeofence(step: TreasureStepReview, config: TreasureModerationConfig): TreasureReviewReason | null {
  if (!step.geohash) return 'STEP_INVALID';
  return validRadius(step.radiusMeters, config) ? null : 'RADIUS_INVALID';
}

function validRadius(radius: number | undefined, config: TreasureModerationConfig): boolean {
  return typeof radius === 'number' && Number.isFinite(radius)
    && radius >= config.minRadiusMeters && radius <= config.maxRadiusMeters;
}

function isProof(value: string): value is TreasureProof {
  return value === 'QR' || value === 'COARSE_GEOFENCE';
}

function reject(reason: TreasureReviewReason): TreasureReviewDecision {
  return { approved: false, reason };
}
