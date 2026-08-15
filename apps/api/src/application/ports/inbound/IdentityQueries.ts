import type { IdentityContext } from '../../contracts/IdentityContext';
import type { Organization } from '../../../domain/entities/Organization';
import type { OrganizationMember } from '../../../domain/entities/OrganizationMember';
import type { User } from '../../../domain/entities/User';

export interface GetUserPort { execute(input: { userId: string }): Promise<User> }
export interface GetOrganizationPort { execute(input: { organizationId: string }): Promise<Organization> }
export interface GetMembershipPort { execute(input: { membershipId: string }): Promise<OrganizationMember> }
export interface ListUserMembershipsPort { execute(input: { userId: string }): Promise<OrganizationMember[]> }
export interface ResolveIdentityContextPort {
  execute(input: { userId: string; organizationId: string; membershipId?: string }): Promise<IdentityContext>;
}
