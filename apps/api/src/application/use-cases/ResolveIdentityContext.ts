import type { ResolveIdentityContextPort } from '../ports/inbound/IdentityQueries';
import type { IdentityContext } from '../contracts/IdentityContext';
import type { UserRepository } from '../ports/outbound/UserRepository';
import type { OrganizationRepository } from '../ports/outbound/OrganizationRepository';
import type { MembershipRepository } from '../ports/outbound/MembershipRepository';
import type { OrganizationMember } from '../../domain/entities/OrganizationMember';
import { IdentityError } from '../errors/IdentityError';

export class ResolveIdentityContextUseCase implements ResolveIdentityContextPort {
  constructor(
    private readonly users: UserRepository,
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
  ) {}

  async execute(input: { userId: string; organizationId: string; membershipId?: string }): Promise<IdentityContext> {
    this.validate(input);
    const user = await this.users.findById(input.userId);
    if (!user) throw new IdentityError('USER_NOT_FOUND');
    if (!user.isActive()) throw new IdentityError('USER_INACTIVE');
    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) throw new IdentityError('ORGANIZATION_NOT_FOUND');
    if (!organization.isActive()) throw new IdentityError('ORGANIZATION_INACTIVE');
    const membership = await this.findMembership(input);
    const activeMembership = this.validateMembership(membership, input.userId, input.organizationId);
    return { userId: user.id, organizationId: organization.id, membershipId: activeMembership.id, membershipStatus: activeMembership.status };
  }

  private validate(input: { userId: string; organizationId: string }): void {
    if (!input.userId.trim() || !input.organizationId.trim()) throw new IdentityError('INVALID_IDENTITY_INPUT');
  }

  private async findMembership(input: { userId: string; organizationId: string; membershipId?: string }) {
    return input.membershipId
      ? this.memberships.findById(input.membershipId)
      : this.memberships.findByUserAndOrganization(input.userId, input.organizationId);
  }

  private validateMembership(membership: OrganizationMember | null, userId: string, organizationId: string): OrganizationMember {
    if (!membership || membership.userId !== userId || membership.organizationId !== organizationId) {
      throw new IdentityError('MEMBERSHIP_NOT_FOUND');
    }
    if (!membership.isActive()) throw new IdentityError('MEMBERSHIP_INACTIVE');
    return membership;
  }
}
