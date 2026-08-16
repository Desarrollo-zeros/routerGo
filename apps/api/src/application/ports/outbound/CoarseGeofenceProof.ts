export type CoarseGeofenceProofInput = {
  expectedGeohash: string;
  observedGeohash: string;
  radiusMeters: number;
  accuracyMeters: number;
  observedAt: Date;
};

export type CoarseGeofenceProofDecision = 'MATCHED' | 'CELL_MISMATCH' | 'ACCURACY_TOO_LOW' | 'INVALID_PROOF';

export interface CoarseGeofenceProofPort {
  verify(input: CoarseGeofenceProofInput): Promise<CoarseGeofenceProofDecision>;
}
