import type { GetProviderAnalyticsPort, ProviderAnalyticsSource } from '../ports/inbound/GetProviderAnalyticsPort.js';
import { evaluateProviderAnalytics, type ProviderAnalyticsPolicy, type ProviderAnalyticsSummary } from '../../domain/providers/ProviderAnalytics.js';

export class GetProviderAnalyticsUseCase implements GetProviderAnalyticsPort {
  constructor(private readonly source: ProviderAnalyticsSource) {}

  async execute(policy: ProviderAnalyticsPolicy): Promise<ProviderAnalyticsSummary[]> {
    return (await this.source.read()).map((item) => evaluateProviderAnalytics(item, policy));
  }
}
