import type { RoleAssignment } from '../../domain/authorization/RoleAssignment';
import type { AuthorizationGrantReader } from '../ports/outbound/AuthorizationGrantReader';

export class InMemoryAuthorizationGrantReader implements AuthorizationGrantReader {
  private readonly grants = new Map<string, readonly RoleAssignment[]>();

  constructor(entries: readonly [string, readonly RoleAssignment[]][] = []) {
    for (const [membershipId, assignments] of entries) this.grants.set(membershipId, assignments);
  }

  async findRoleAssignments(membershipId: string): Promise<readonly RoleAssignment[]> {
    return this.grants.get(membershipId) ?? [];
  }
}
