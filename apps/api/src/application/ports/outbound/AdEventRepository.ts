export type CampaignEventType = 'IMPRESSION' | 'CLICK' | 'CONVERSION' | 'REWARD';

export type CampaignEventInput = {
  id: string;
  campaignId: string;
  placementId?: string;
  eventKey: string;
  eventType: CampaignEventType;
  amountMicro: bigint;
  metadata?: Record<string, string>;
};

export type CampaignEventResult = 'RECORDED' | 'DUPLICATE';

export interface AdEventRepository {
  recordCampaignEvent(input: CampaignEventInput): Promise<CampaignEventResult>;
}
