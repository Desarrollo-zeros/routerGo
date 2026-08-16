import { describe, expect, it } from 'vitest';
import { DecideAd } from './DecideAd.js';
import { DirectInventoryStrategy, HouseInventoryStrategy, ThirdPartyInventoryStrategy } from '../services/AdInventoryStrategies.js';
import type { AdCandidate } from '../../domain/ads/AdDecision.js';
import type { AdEligibilityGate } from '../ports/outbound/AdEligibilityTelemetry.js';

const candidate = (inventory: AdCandidate['inventory'], status: AdCandidate['campaignStatus'] = 'ACTIVE'): AdCandidate => ({
  campaignId: `${inventory}-campaign`, creativeId: `${inventory}-creative`, inventory,
  campaignStatus: status, moderationStatus: 'APPROVED', sponsoredLabel: 'Sponsored', payload: { title: inventory },
});

const decision = () => new DecideAd([
  new DirectInventoryStrategy(), new ThirdPartyInventoryStrategy(), new HouseInventoryStrategy(),
]);

describe('DecideAd', () => {
  it('prefers direct inventory when more than one source is eligible', async () => {
    const result = await decision().decide({ placementKey: 'home', candidates: [candidate('HOUSE'), candidate('DIRECT')] });
    expect(result.candidate?.inventory).toBe('DIRECT');
  });

  it('falls back to an allowed source without accepting paused or unmoderated ads', async () => {
    const paused = candidate('DIRECT', 'PAUSED');
    const house = candidate('HOUSE');
    const result = await decision().decide({ placementKey: 'home', candidates: [paused, house], allowedInventories: ['HOUSE'] });
    expect(result.candidate?.inventory).toBe('HOUSE');
  });

  it('can select third-party inventory through the same contract', async () => {
    const result = await decision().decide({ placementKey: 'home', candidates: [candidate('THIRD_PARTY')], allowedInventories: ['THIRD_PARTY'] });
    expect(result.candidate?.inventory).toBe('THIRD_PARTY');
  });

  it('returns explicit no-fill when no eligible candidate exists', async () => {
    const draft = { ...candidate('THIRD_PARTY'), moderationStatus: 'DRAFT' as const };
    const result = await decision().decide({ placementKey: 'home', candidates: [draft] });
    expect(result).toEqual({ outcome: 'NO_FILL', inventory: null, candidate: null, reason: 'NO_ELIGIBLE_CANDIDATE' });
  });

  it('applies the configured eligibility gate before selecting a candidate', async () => {
    const gate: AdEligibilityGate = { execute: async (input) => {
      if (input.campaignId === 'HOUSE-campaign') return { decision: { allowed: true, reason: 'ELIGIBLE' } };
      return { decision: { allowed: false, reason: 'CLICK_FRAUD_SIGNAL' } };
    } };
    const result = await new DecideAd([new DirectInventoryStrategy(), new HouseInventoryStrategy()], gate).decide({
      placementKey: 'home', candidates: [candidate('DIRECT'), candidate('HOUSE')],
      eligibility: { eventKey: 'delivery', id: 'decision', consentGranted: true, region: 'CO', allowedRegions: ['CO'], impressionsInWindow: 0, frequencyCap: 3, clickRate: 0, maxClickRate: 0.1 },
    });
    expect(result.candidate?.inventory).toBe('HOUSE');
  });
});
