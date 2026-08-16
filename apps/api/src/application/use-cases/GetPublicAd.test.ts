import { describe, expect, it, vi } from 'vitest';
import { GetPublicAd } from './GetPublicAd.js';
import type { AdCandidate } from '../../domain/ads/AdDecision.js';

describe('GetPublicAd', () => {
  it('returns the selected persisted candidate payload', async () => {
    const candidate: AdCandidate = { campaignId: 'c1', creativeId: 'cr1', inventory: 'DIRECT', campaignStatus: 'ACTIVE', moderationStatus: 'APPROVED', sponsoredLabel: 'Acme', payload: { title: 'Move more', body: 'Today' } };
    const reader = { listForPlacement: vi.fn().mockResolvedValue([candidate]) };
    const decision = { decide: vi.fn().mockResolvedValue({ outcome: 'SELECTED', reason: 'SELECTED', inventory: 'DIRECT', candidate }) };
    const result = await new GetPublicAd(reader, decision).execute('activity-inline');
    expect(result).toMatchObject({ outcome: 'SELECTED', placementKey: 'activity-inline', title: 'Move more', body: 'Today' });
  });

  it('preserves an honest no-fill decision', async () => {
    const reader = { listForPlacement: vi.fn().mockResolvedValue([]) };
    const decision = { decide: vi.fn().mockResolvedValue({ outcome: 'NO_FILL', reason: 'NO_ELIGIBLE_CANDIDATE', inventory: null, candidate: null }) };
    await expect(new GetPublicAd(reader, decision).execute('chat-inline')).resolves.toMatchObject({ outcome: 'NO_FILL', reason: 'NO_ELIGIBLE_CANDIDATE' });
  });
});
