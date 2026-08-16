import type { ProviderHealthProbe } from '../../../application/ports/outbound/ProviderHealthProbe.js';
import type { ProviderHealth } from '../../../domain/providers/ProviderAnalytics.js';

export class HttpProviderHealthProbe implements ProviderHealthProbe {
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 2_000) {}

  async check(input: { gatewayId: string; baseUrl: string }): Promise<ProviderHealth> {
    if (!input.baseUrl) return 'UNAVAILABLE';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(input.baseUrl, { method: 'HEAD', signal: controller.signal });
      return response.ok ? 'HEALTHY' : 'DEGRADED';
    } catch {
      return 'UNAVAILABLE';
    } finally {
      clearTimeout(timer);
    }
  }
}
