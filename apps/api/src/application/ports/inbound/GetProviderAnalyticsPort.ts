import type { ProviderAnalyticsPolicy, ProviderAnalyticsSummary } from '../../../domain/providers/ProviderAnalytics.js';

export interface ProviderAnalyticsSource {
  read(): Promise<Array<{ gatewayId: string; health: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'; quotaUsagePct: number; costMicro: number }>>;
}

export interface ProviderAnalyticsAlertSink {
  record(summary: ProviderAnalyticsSummary): Promise<void>;
}

export interface GetProviderAnalyticsPort {
  execute(policy: ProviderAnalyticsPolicy): Promise<ProviderAnalyticsSummary[]>;
}
