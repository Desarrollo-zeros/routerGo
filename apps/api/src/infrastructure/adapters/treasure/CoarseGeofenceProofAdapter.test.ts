import { describe, expect, it } from 'vitest';
import { CoarseGeofenceProofAdapter } from './CoarseGeofenceProofAdapter.js';

const adapter = new CoarseGeofenceProofAdapter({ minRadiusMeters: 100, maxRadiusMeters: 1000, maxAgeMs: 300_000 });

function proof(overrides: Partial<Parameters<typeof adapter.verify>[0]> = {}) {
  return { expectedGeohash: '9q8yy', observedGeohash: '9q8yy', radiusMeters: 250, accuracyMeters: 80, observedAt: new Date(), ...overrides };
}

describe('CoarseGeofenceProofAdapter', () => {
  it('matches a fresh coarse cell inside the configured accuracy budget', async () => {
    await expect(adapter.verify(proof())).resolves.toBe('MATCHED');
  });

  it('does not retain location and rejects mismatch, stale, or overly inaccurate proofs', async () => {
    await expect(adapter.verify(proof({ observedGeohash: '9q8yz' }))).resolves.toBe('CELL_MISMATCH');
    await expect(adapter.verify(proof({ observedAt: new Date(Date.now() - 300_001) }))).resolves.toBe('INVALID_PROOF');
    await expect(adapter.verify(proof({ accuracyMeters: 300 }))).resolves.toBe('ACCURACY_TOO_LOW');
  });
});
