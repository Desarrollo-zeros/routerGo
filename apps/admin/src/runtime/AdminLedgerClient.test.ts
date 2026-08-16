import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpAdminLedgerClient } from './AdminLedgerClient';

afterEach(() => { vi.unstubAllGlobals(); });

describe('HttpAdminLedgerClient', () => {
  it('reads authenticated ledger entries with a bounded query', async () => {
    const entries = [{ id: 'entry-1', kind: 'SPEND', amount: '-72', occurredAt: '2030-01-01T00:00:00.000Z' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ entries }), { status: 200 })));

    await expect(new HttpAdminLedgerClient('/api').read('token', 20)).resolves.toEqual({ entries });
    expect(fetch).toHaveBeenCalledWith('/api/admin/ledger?limit=20', { headers: { authorization: 'Bearer token' } });
  });

  it('rejects malformed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ entries: [{ id: 'entry-1' }] }), { status: 200 })));

    await expect(new HttpAdminLedgerClient().read('token')).rejects.toThrow('admin_ledger_invalid_response');
  });
});
