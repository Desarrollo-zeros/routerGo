import { describe, expect, it } from 'vitest';
import { Campaign } from './Campaign.js';

function activeCampaign(budget = 100n): Campaign {
  const campaign = Campaign.create('campaign-1', 'org-1', budget);
  campaign.submitForReview();
  campaign.approve();
  campaign.activate();
  return campaign;
}

describe('Campaign', () => {
  it('requires moderation before activation and follows explicit state transitions', () => {
    const campaign = Campaign.create('campaign-1', 'org-1', 100n);
    expect(() => campaign.activate()).toThrow('CAMPAIGN_INVALID_TRANSITION');
    campaign.submitForReview();
    expect(campaign.moderationStatus).toBe('REVIEW');
    campaign.approve();
    campaign.activate();
    expect(campaign.currentStatus).toBe('ACTIVE');
  });

  it('never spends beyond its fixed USD micro budget', () => {
    const campaign = activeCampaign(100n);
    campaign.recordSpend(60n);
    expect(() => campaign.recordSpend(41n)).toThrow('CAMPAIGN_BUDGET_EXCEEDED');
    campaign.recordSpend(40n);
    expect(campaign.currentStatus).toBe('COMPLETED');
  });

  it('supports pause/resume but rejects delivery while paused', () => {
    const campaign = activeCampaign();
    campaign.pause();
    expect(() => campaign.recordSpend(1n)).toThrow('CAMPAIGN_NOT_ACTIVE');
    campaign.resume();
    expect(() => campaign.recordSpend(1n)).not.toThrow();
  });
});
