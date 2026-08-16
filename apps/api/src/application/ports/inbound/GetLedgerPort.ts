import type { IdentityContext } from '../../contracts/IdentityContext.js';

export interface LedgerReadRow { id: string; kind: string; amount: string; occurredAt: string; }
export interface GetLedgerPort { execute(input: { identity: IdentityContext; limit?: number }): Promise<{ entries: LedgerReadRow[] }>; }
