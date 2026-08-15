import type { Organization } from '../../domain/entities/Organization';
import type { OrganizationMember } from '../../domain/entities/OrganizationMember';
import type { User } from '../../domain/entities/User';
import type { OrganizationRepository } from '../ports/outbound/OrganizationRepository';
import type { MembershipRepository } from '../ports/outbound/MembershipRepository';
import type { UserRepository } from '../ports/outbound/UserRepository';

export interface IdentityRepositories {
  users: UserRepository;
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
}

export function identityRepositories(
  users: readonly User[] = [],
  organizations: readonly Organization[] = [],
  memberships: readonly OrganizationMember[] = [],
): IdentityRepositories {
  return {
    users: { findById: async (id) => users.find((value) => value.id === id) ?? null },
    organizations: { findById: async (id) => organizations.find((value) => value.id === id) ?? null },
    memberships: {
      findById: async (id) => memberships.find((value) => value.id === id) ?? null,
      findByUserAndOrganization: async (userId, organizationId) => memberships.find(
        (value) => value.userId === userId && value.organizationId === organizationId,
      ) ?? null,
      findByUserId: async (userId) => memberships.filter((value) => value.userId === userId),
    },
  };
}
