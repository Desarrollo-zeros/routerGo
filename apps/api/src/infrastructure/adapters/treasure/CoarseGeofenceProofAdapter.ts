import type { CoarseGeofenceProofDecision, CoarseGeofenceProofInput, CoarseGeofenceProofPort } from '../../../application/ports/outbound/CoarseGeofenceProof.js';

export type CoarseGeofenceProofConfig = { minRadiusMeters: number; maxRadiusMeters: number; maxAgeMs: number };

export class CoarseGeofenceProofAdapter implements CoarseGeofenceProofPort {
  constructor(private readonly config: CoarseGeofenceProofConfig) {}

  async verify(input: CoarseGeofenceProofInput): Promise<CoarseGeofenceProofDecision> {
    if (!validShape(input, this.config)) return 'INVALID_PROOF';
    if (Date.now() - input.observedAt.getTime() > this.config.maxAgeMs) return 'INVALID_PROOF';
    if (input.observedGeohash !== input.expectedGeohash) return 'CELL_MISMATCH';
    return input.accuracyMeters <= input.radiusMeters ? 'MATCHED' : 'ACCURACY_TOO_LOW';
  }
}

function validShape(input: CoarseGeofenceProofInput, config: CoarseGeofenceProofConfig): boolean {
  return validGeohash(input.expectedGeohash)
    && validGeohash(input.observedGeohash)
    && input.radiusMeters >= config.minRadiusMeters
    && input.radiusMeters <= config.maxRadiusMeters
    && Number.isFinite(input.accuracyMeters)
    && input.accuracyMeters >= 0
    && Number.isFinite(input.observedAt.getTime())
    && Date.now() >= input.observedAt.getTime();
}

function validGeohash(value: string): boolean {
  return value.length >= 1 && value.length <= 6 && /^[0123456789bcdefghjkmnpqrstuvwxyz]+$/i.test(value);
}
