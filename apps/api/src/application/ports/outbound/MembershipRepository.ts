import type { OrganizationMember } from '../../../domain/entities/OrganizationMember';

export interface MembershipRepository {
  findById(id: string): Promise<OrganizationMember | null>;
  findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMember | null>;
  findByUserId(userId: string): Promise<OrganizationMember[]>;
}
