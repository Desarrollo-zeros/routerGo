import type { ListUserMembershipsPort } from '../ports/inbound/IdentityQueries';
import type { MembershipRepository } from '../ports/outbound/MembershipRepository';
import type { UserRepository } from '../ports/outbound/UserRepository';
import { IdentityError } from '../errors/IdentityError';
import type { OrganizationMember } from '../../domain/entities/OrganizationMember';

export class ListUserMembershipsUseCase implements ListUserMembershipsPort {
  constructor(private readonly users: UserRepository, private readonly memberships: MembershipRepository) {}

  async execute(input: { userId: string }): Promise<OrganizationMember[]> {
    if (!input.userId.trim()) throw new IdentityError('INVALID_IDENTITY_INPUT');
    if (!await this.users.findById(input.userId)) throw new IdentityError('USER_NOT_FOUND');
    return this.memberships.findByUserId(input.userId);
  }
}
