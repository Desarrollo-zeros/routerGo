import type { LedgerReadRow } from '../inbound/GetLedgerPort.js';

export interface AdminLedgerReader { listByOrganization(organizationId: string, limit: number): Promise<LedgerReadRow[]>; }
