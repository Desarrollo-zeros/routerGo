import type { RoleAssignment } from './RoleAssignment';
import type { MembershipStatus } from '../entities/OrganizationMember';

export interface AuthorizationSubjectIdentity {
  userId: string;
  membershipId: string;
  organizationId: string;
  membershipStatus: MembershipStatus;
}

export interface AuthorizationSubject extends AuthorizationSubjectIdentity {
  roles: readonly RoleAssignment[];
}
