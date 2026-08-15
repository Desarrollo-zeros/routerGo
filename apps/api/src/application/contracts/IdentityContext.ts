import type { MembershipStatus } from '../../domain/entities/OrganizationMember';

export interface IdentityContext {
  userId: string;
  organizationId: string;
  membershipId: string;
  membershipStatus: MembershipStatus;
}
