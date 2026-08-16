import { describe, expect, it } from 'vitest';
import { EvaluateAdEligibility } from './EvaluateAdEligibility.js';

const input = { id: 'eligibility-1', eventKey: 'eligibility-key', campaignId: 'campaign-1', consentGranted: true, region: 'CO', allowedRegions: ['CO'], impressionsInWindow: 1, frequencyCap: 3, clickRate: 0.02, maxClickRate: 0.1 };

describe('EvaluateAdEligibility', () => {
  it('records a decision before allowing delivery', async () => {
    const records: unknown[] = [];
    const useCase = new EvaluateAdEligibility({ record: async (event) => { records.push(event); return 'RECORDED'; } });
    await expect(useCase.execute(input)).resolves.toMatchObject({ decision: { allowed: true, reason: 'ELIGIBLE' }, telemetry: 'RECORDED' });
    expect(records[0]).toMatchObject({ eventKey: 'eligibility-key', allowed: true, clickRateBps: 200 });
  });

  it('denies delivery when telemetry is unavailable', async () => {
    const useCase = new EvaluateAdEligibility({ record: async () => { throw new Error('telemetry_down'); } });
    await expect(useCase.execute(input)).resolves.toEqual({ decision: { allowed: false, reason: 'TELEMETRY_UNAVAILABLE' }, telemetry: 'UNAVAILABLE' });
  });
});
