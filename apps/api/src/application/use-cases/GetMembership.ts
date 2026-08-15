import type { GetMembershipPort } from '../ports/inbound/IdentityQueries';
import type { MembershipRepository } from '../ports/outbound/MembershipRepository';
import { IdentityError } from '../errors/IdentityError';
import type { OrganizationMember } from '../../domain/entities/OrganizationMember';

export class GetMembershipUseCase implements GetMembershipPort {
  constructor(private readonly memberships: MembershipRepository) {}

  async execute(input: { membershipId: string }): Promise<OrganizationMember> {
    if (!input.membershipId.trim()) throw new IdentityError('INVALID_IDENTITY_INPUT');
    const membership = await this.memberships.findById(input.membershipId);
    if (!membership) throw new IdentityError('MEMBERSHIP_NOT_FOUND');
    return membership;
  }
}
