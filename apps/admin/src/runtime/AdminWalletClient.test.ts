import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpAdminWalletClient } from './AdminWalletClient';

afterEach(() => { vi.unstubAllGlobals(); });

describe('HttpAdminWalletClient', () => {
  it('reads the authenticated wallet response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ walletId: 'wallet-1', balance: '928', version: 3 }), { status: 200 })));

    await expect(new HttpAdminWalletClient('/api').read('token')).resolves.toEqual({ walletId: 'wallet-1', balance: '928', version: 3 });
    expect(fetch).toHaveBeenCalledWith('/api/admin/wallet', { headers: { authorization: 'Bearer token' } });
  });

  it('rejects malformed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ balance: 928 }), { status: 200 })));

    await expect(new HttpAdminWalletClient().read('token')).rejects.toThrow('admin_wallet_invalid_response');
  });
});
