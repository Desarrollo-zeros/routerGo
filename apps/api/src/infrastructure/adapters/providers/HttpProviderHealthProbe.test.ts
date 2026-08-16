import { describe, expect, it, vi } from 'vitest';
import { HttpProviderHealthProbe } from './HttpProviderHealthProbe.js';

describe('HttpProviderHealthProbe', () => {
  it('maps an explicit successful probe to healthy', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    await expect(new HttpProviderHealthProbe(fetcher).check({ gatewayId: 'gw', baseUrl: 'http://provider/health' })).resolves.toBe('HEALTHY');
    expect(fetcher).toHaveBeenCalledWith('http://provider/health', expect.objectContaining({ method: 'HEAD' }));
  });

  it('fails closed on probe errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(new HttpProviderHealthProbe(fetcher).check({ gatewayId: 'gw', baseUrl: 'http://provider/health' })).resolves.toBe('UNAVAILABLE');
  });
});
