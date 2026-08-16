import type pg from 'pg';
import { normalizeRoleAssignment, type RoleAssignment } from '../../../domain/authorization/RoleAssignment.js';
import type { AuthorizationGrantReader } from '../../../application/ports/outbound/AuthorizationGrantReader.js';

type Row = { role_id: string; role_key: string; scope: 'GLOBAL' | 'ORGANIZATION'; organization_id: string | null; is_system: boolean; permission_keys: string[] | null };

export class PostgresAuthorizationGrantReader implements AuthorizationGrantReader {
  constructor(private readonly pool: pg.Pool) {}

  async findRoleAssignments(membershipId: string): Promise<readonly RoleAssignment[]> {
    const result = await this.pool.query<Row>(
      `SELECT r.id AS role_id, r.role_key, r.scope, r.organization_id, r.is_system,
              ARRAY_REMOVE(ARRAY_AGG(p.permission_key), NULL) AS permission_keys
       FROM member_roles mr JOIN roles r ON r.id=mr.role_id
       LEFT JOIN role_permissions rp ON rp.role_id=r.id
       LEFT JOIN permissions p ON p.id=rp.permission_id
       WHERE mr.member_id=$1 GROUP BY r.id ORDER BY r.id`,
      [membershipId],
    );
    return result.rows.map((row) => normalizeRoleAssignment({
      roleId: row.role_id, roleKey: row.role_key, scope: row.scope, organizationId: row.organization_id,
      isSystem: row.is_system, isActive: true, permissionKeys: row.permission_keys ?? [],
    }));
  }
}
