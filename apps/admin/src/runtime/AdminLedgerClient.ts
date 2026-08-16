export interface AdminLedgerEntry {
  id: string;
  kind: string;
  amount: string;
  occurredAt: string;
}

export interface AdminLedgerSummary { entries: AdminLedgerEntry[]; }

export interface AdminLedgerClient {
  read(accessToken: string, limit?: number): Promise<AdminLedgerSummary>;
}

export class HttpAdminLedgerClient implements AdminLedgerClient {
  constructor(private readonly baseUrl = '') {}

  async read(accessToken: string, limit = 50): Promise<AdminLedgerSummary> {
    if (!accessToken.trim()) throw new Error('admin_access_token_required');
    const query = `?limit=${encodeURIComponent(String(limit))}`;
    const response = await fetch(`${this.baseUrl}/admin/ledger${query}`, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`admin_ledger_${response.status}`);
    return parseLedger(await response.json());
  }
}

function parseLedger(value: unknown): AdminLedgerSummary {
  if (!isRecord(value) || !Array.isArray(value.entries) || !value.entries.every(isLedgerEntry)) {
    throw new Error('admin_ledger_invalid_response');
  }
  return { entries: value.entries };
}

function isLedgerEntry(value: unknown): value is AdminLedgerEntry {
  if (!isRecord(value)) return false;
  return ['id', 'kind', 'amount', 'occurredAt'].every((key) => typeof value[key] === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
