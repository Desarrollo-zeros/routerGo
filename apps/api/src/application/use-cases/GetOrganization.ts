import type { GetOrganizationPort } from '../ports/inbound/IdentityQueries';
import type { OrganizationRepository } from '../ports/outbound/OrganizationRepository';
import { IdentityError } from '../errors/IdentityError';
import type { Organization } from '../../domain/entities/Organization';

export class GetOrganizationUseCase implements GetOrganizationPort {
  constructor(private readonly organizations: OrganizationRepository) {}

  async execute(input: { organizationId: string }): Promise<Organization> {
    if (!input.organizationId.trim()) throw new IdentityError('INVALID_IDENTITY_INPUT');
    const organization = await this.organizations.findById(input.organizationId);
    if (!organization) throw new IdentityError('ORGANIZATION_NOT_FOUND');
    return organization;
  }
}
