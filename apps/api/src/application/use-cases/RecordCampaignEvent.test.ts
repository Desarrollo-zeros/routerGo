import { describe, expect, it, vi } from 'vitest';
import { RecordCampaignEvent } from './RecordCampaignEvent.js';

const input = { id: 'event-1', campaignId: 'campaign-1', eventKey: 'delivery-1', eventType: 'CLICK' as const, amountMicro: 3n };

describe('RecordCampaignEvent', () => {
  it('delegates idempotent recording to the outbound port', async () => {
    const repository = { recordCampaignEvent: vi.fn().mockResolvedValue('RECORDED' as const) };
    await expect(new RecordCampaignEvent(repository).execute(input)).resolves.toBe('RECORDED');
    expect(repository.recordCampaignEvent).toHaveBeenCalledWith(input);
  });

  it('rejects negative amounts and priced impressions', async () => {
    const repository = { recordCampaignEvent: vi.fn() };
    await expect(new RecordCampaignEvent(repository).execute({ ...input, amountMicro: -1n })).rejects.toThrow('AD_EVENT_AMOUNT_INVALID');
    await expect(new RecordCampaignEvent(repository).execute({ ...input, eventType: 'IMPRESSION', amountMicro: 1n })).rejects.toThrow('IMPRESSION_AMOUNT_INVALID');
  });
});
