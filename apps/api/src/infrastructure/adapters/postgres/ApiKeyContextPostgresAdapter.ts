import type { Pool } from 'pg';
import type { ApiKeyPrincipal } from '../../../application/ports/inbound/ApiKeyLifecyclePort.js';
import type { ApiKeyContextResolver, ApiKeyRequestContext } from '../../../application/ports/outbound/ApiKeyContextResolver.js';

type Row = { user_id: string; wallet_id: string };

export class ApiKeyContextPostgresAdapter implements ApiKeyContextResolver {
  constructor(private readonly pool: Pool) {}

  async resolve(principal: ApiKeyPrincipal): Promise<ApiKeyRequestContext | null> {
    const result = await this.pool.query<Row>(
      `SELECT m.user_id, w.id AS wallet_id
       FROM api_clients c
       JOIN organization_members m ON m.organization_id=c.organization_id AND m.status='ACTIVE'
       JOIN wallets w ON w.user_id=m.user_id
       WHERE c.id=$1 AND c.status='ACTIVE'
       ORDER BY m.created_at LIMIT 1`,
      [principal.clientId],
    );
    const row = result.rows[0];
    return row ? { ...principal, userId: row.user_id, walletId: row.wallet_id } : null;
  }
}
