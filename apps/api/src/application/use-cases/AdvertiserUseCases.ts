import type { AdvertiserReader, AdvertiserWriter } from '../ports/inbound/AdvertiserPort.js';

export class GetAdvertiserAccount {
  constructor(private readonly reader: AdvertiserReader) {}
  execute(organizationId: string) { return this.reader.account(organizationId); }
}

export class ListAdvertiserCampaigns {
  constructor(private readonly reader: AdvertiserReader) {}
  execute(organizationId: string) { return this.reader.campaigns(organizationId); }
}

export class ListAdvertiserCreatives {
  constructor(private readonly reader: AdvertiserReader) {}
  execute(organizationId: string) { return this.reader.creatives(organizationId); }
}

export class GetAdvertiserAnalytics {
  constructor(private readonly reader: AdvertiserReader) {}
  execute(organizationId: string) { return this.reader.analytics(organizationId); }
}

export class CreateAdvertiserCampaign {
  constructor(private readonly writer: AdvertiserWriter) {}
  execute(input: { organizationId: string; name: string; budgetMicro: bigint; sponsoredLabel: string }) {
    if (!input.name.trim() || input.budgetMicro <= 0n || !input.sponsoredLabel.trim()) throw new Error('INVALID_CAMPAIGN');
    return this.writer.createCampaign(input);
  }
}

export class CreateAdvertiserCreative {
  constructor(private readonly writer: AdvertiserWriter) {}
  execute(input: { organizationId: string; campaignId: string; kind: string; payload: Record<string, unknown> }) {
    if (!input.campaignId || !['TEXT', 'IMAGE', 'VIDEO', 'CHALLENGE'].includes(input.kind)) throw new Error('INVALID_CREATIVE');
    return this.writer.createCreative(input);
  }
}

export class SubmitAdvertiserCampaign {
  constructor(private readonly writer: AdvertiserWriter) {}
  execute(input: { organizationId: string; campaignId: string }) { return this.writer.submitCampaign(input); }
}
