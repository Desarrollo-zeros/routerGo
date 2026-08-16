export interface AdminWalletSummary {
  walletId: string;
  balance: string;
  version: number;
}

export interface AdminWalletClient {
  read(accessToken: string): Promise<AdminWalletSummary>;
}

export class HttpAdminWalletClient implements AdminWalletClient {
  constructor(private readonly baseUrl = '') {}

  async read(accessToken: string): Promise<AdminWalletSummary> {
    if (!accessToken.trim()) throw new Error('admin_access_token_required');
    const response = await fetch(`${this.baseUrl}/admin/wallet`, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`admin_wallet_${response.status}`);
    return parseWallet(await response.json());
  }
}

function parseWallet(value: unknown): AdminWalletSummary {
  if (!isRecord(value) || typeof value.walletId !== 'string' || typeof value.balance !== 'string' || typeof value.version !== 'number') {
    throw new Error('admin_wallet_invalid_response');
  }
  return { walletId: value.walletId, balance: value.balance, version: value.version };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
