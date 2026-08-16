import type { ProviderHealth } from '../../../domain/providers/ProviderAnalytics.js';

export interface ProviderHealthProbe {
  check(input: { gatewayId: string; baseUrl: string }): Promise<ProviderHealth>;
}
