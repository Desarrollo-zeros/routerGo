import { describe, expect, it } from 'vitest';
import { GetProviderAnalyticsUseCase } from './GetProviderAnalytics.js';

describe('GetProviderAnalyticsUseCase', () => {
  it('converts explicit provider signals into actionable alerts', async () => {
    const source = { read: async () => [{ gatewayId: 'go', health: 'DEGRADED' as const, quotaUsagePct: 91, costMicro: 20 }] };
    const alerts: string[] = [];
    const sink = { record: async (summary: { alert: string }) => { alerts.push(summary.alert); } };
    await expect(new GetProviderAnalyticsUseCase(source, sink).execute({ quotaWarningPct: 75, quotaExceededPct: 90 })).resolves.toEqual([{ gatewayId: 'go', health: 'DEGRADED', quotaUsagePct: 91, costMicro: 20, alert: 'QUOTA_EXCEEDED' }]);
    expect(alerts).toEqual(['QUOTA_EXCEEDED']);
  });
});
