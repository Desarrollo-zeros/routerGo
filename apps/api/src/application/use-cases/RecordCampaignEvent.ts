import type { AdEventRepository, CampaignEventInput, CampaignEventResult } from '../ports/outbound/AdEventRepository.js';

export class RecordCampaignEvent {
  constructor(private readonly repository: AdEventRepository) {}

  async execute(input: CampaignEventInput): Promise<CampaignEventResult> {
    if (input.amountMicro < 0n) throw new Error('AD_EVENT_AMOUNT_INVALID');
    if (input.eventType === 'IMPRESSION' && input.amountMicro !== 0n) throw new Error('IMPRESSION_AMOUNT_INVALID');
    return this.repository.recordCampaignEvent(input);
  }
}
