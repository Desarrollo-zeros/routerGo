import type { GetProviderAnalyticsPort, ProviderAnalyticsAlertSink, ProviderAnalyticsSource } from '../ports/inbound/GetProviderAnalyticsPort.js';
import { evaluateProviderAnalytics, type ProviderAnalyticsPolicy, type ProviderAnalyticsSummary } from '../../domain/providers/ProviderAnalytics.js';

export class GetProviderAnalyticsUseCase implements GetProviderAnalyticsPort {
  constructor(private readonly source: ProviderAnalyticsSource, private readonly alerts?: ProviderAnalyticsAlertSink) {}

  async execute(policy: ProviderAnalyticsPolicy): Promise<ProviderAnalyticsSummary[]> {
    const summaries = (await this.source.read()).map((item) => evaluateProviderAnalytics(item, policy));
    await Promise.all(summaries.filter((item) => item.alert !== 'NONE').map((item) => this.alerts?.record(item)));
    return summaries;
  }
}
