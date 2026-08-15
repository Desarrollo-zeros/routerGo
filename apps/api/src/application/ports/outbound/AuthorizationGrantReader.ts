import type { RoleAssignment } from '../../../domain/authorization/RoleAssignment';

export interface AuthorizationGrantReader {
  findRoleAssignments(membershipId: string): Promise<readonly RoleAssignment[]>;
}
