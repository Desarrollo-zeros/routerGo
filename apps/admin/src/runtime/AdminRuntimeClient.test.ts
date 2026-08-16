import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpAdminRuntimeClient } from './AdminRuntimeClient';

afterEach(() => { vi.unstubAllGlobals(); });

describe('HttpAdminRuntimeClient', () => {
  it('sends an idempotent authenticated publish request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 5, contentHash: 'a'.repeat(64), manifest: {} }), { status: 200 })));

    await expect(new HttpAdminRuntimeClient('/api').publish('token', 'operation-1')).resolves.toMatchObject({ version: 5 });
    expect(fetch).toHaveBeenCalledWith('/api/admin/runtime/publish', expect.objectContaining({ method: 'POST', headers: { authorization: 'Bearer token', 'idempotency-key': 'operation-1' } }));
  });
});
