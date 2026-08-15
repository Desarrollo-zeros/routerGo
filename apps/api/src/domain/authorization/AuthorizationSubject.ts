import type { RoleAssignment } from './RoleAssignment';

export interface AuthorizationSubjectIdentity {
  userId: string;
  membershipId: string;
  organizationId: string;
  isActive: boolean;
  membershipIsActive: boolean;
}

export interface AuthorizationSubject extends AuthorizationSubjectIdentity {
  roles: readonly RoleAssignment[];
}
