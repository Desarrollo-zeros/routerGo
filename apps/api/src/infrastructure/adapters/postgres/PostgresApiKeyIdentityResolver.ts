import type pg from 'pg';
import type { IdentityContext } from '../../../application/contracts/IdentityContext.js';
import type { ApiKeyIdentityResolver } from '../../../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { ApiKeyRequestContext } from '../../../application/ports/outbound/ApiKeyContextResolver.js';
import type { MembershipStatus } from '../../../domain/entities/OrganizationMember.js';

type Row = { membership_id: string; organization_id: string; membership_status: MembershipStatus };

export class PostgresApiKeyIdentityResolver implements ApiKeyIdentityResolver {
  constructor(private readonly pool: pg.Pool) {}

  async resolve(context: ApiKeyRequestContext): Promise<IdentityContext | null> {
    const result = await this.pool.query<Row>(
      `SELECT m.id AS membership_id, m.organization_id, m.status AS membership_status
       FROM organization_members m JOIN api_clients c ON c.organization_id=m.organization_id
       JOIN organizations o ON o.id=m.organization_id AND o.status='ACTIVE'
       JOIN users u ON u.id=m.user_id
       WHERE c.id=$1 AND m.user_id=$2 AND u.status='ACTIVE'
       ORDER BY m.created_at LIMIT 1`,
      [context.clientId, context.userId],
    );
    const row = result.rows[0];
    return row ? { userId: context.userId, organizationId: row.organization_id, membershipId: row.membership_id, membershipStatus: row.membership_status } : null;
  }
}
