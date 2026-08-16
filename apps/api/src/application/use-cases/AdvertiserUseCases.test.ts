import { describe, expect, it, vi } from 'vitest';
import { CreateAdvertiserCampaign, SubmitAdvertiserCampaign } from './AdvertiserUseCases.js';

describe('advertiser application boundaries', () => {
  it('rejects non-positive budgets before persistence', async () => {
    const writer = { createCampaign: vi.fn(), createCreative: vi.fn(), submitCampaign: vi.fn() };
    expect(() => new CreateAdvertiserCampaign(writer).execute({ organizationId: 'org-a', name: 'Test', budgetMicro: 0n, sponsoredLabel: 'Sponsored' })).toThrow('INVALID_CAMPAIGN');
    expect(writer.createCampaign).not.toHaveBeenCalled();
  });

  it('passes organization scope to campaign submission', async () => {
    const writer = { createCampaign: vi.fn(), createCreative: vi.fn(), submitCampaign: vi.fn().mockResolvedValue({ status: 'REVIEW' }) };
    await new SubmitAdvertiserCampaign(writer).execute({ organizationId: 'org-a', campaignId: 'campaign-a' });
    expect(writer.submitCampaign).toHaveBeenCalledWith({ organizationId: 'org-a', campaignId: 'campaign-a' });
  });
});
