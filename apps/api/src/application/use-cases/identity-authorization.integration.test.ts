import { describe, expect, it } from 'vitest';
import { Organization } from '../../domain/entities/Organization.js';
import { OrganizationMember } from '../../domain/entities/OrganizationMember.js';
import { User } from '../../domain/entities/User.js';
import { OrganizationSlug } from '../../domain/value-objects/OrganizationSlug.js';
import type { RoleAssignment } from '../../domain/authorization/RoleAssignment.js';
import type { AccessDecision } from '../../domain/authorization/AccessDecision.js';
import { InMemoryAuthorizationGrantReader } from '../testing/InMemoryAuthorizationGrantReader.js';
import { identityRepositories } from '../testing/InMemoryIdentityRepositories.js';
import type { IdentityContext } from '../contracts/IdentityContext.js';
import { AuthorizePermissionUseCase } from './AuthorizePermission.js';
import { ResolveIdentityContextUseCase } from './ResolveIdentityContext.js';

const user = User.create({ id: 'user-1', status: 'ACTIVE' });
const organization = Organization.create({ id: 'org-a', name: 'Advertiser A', slug: OrganizationSlug.create('advertiser-a'), kind: 'ADVERTISER', status: 'ACTIVE' });
const membership = OrganizationMember.create({ id: 'member-a', userId: user.id, organizationId: organization.id, status: 'ACTIVE' });

function role(overrides: Partial<RoleAssignment> = {}): RoleAssignment {
  return { roleId: 'role-1', roleKey: 'CUSTOM', scope: 'GLOBAL', organizationId: null, isSystem: false, isActive: true, permissionKeys: [], ...overrides };
}

async function resolveIdentity(currentUser = user, currentOrganization = organization, currentMembership = membership): Promise<IdentityContext> {
  const repos = identityRepositories([currentUser], [currentOrganization], [currentMembership]);
  return new ResolveIdentityContextUseCase(repos.users, repos.organizations, repos.memberships).execute({
    userId: user.id,
    organizationId: organization.id,
  });
}

async function authorize(identity: IdentityContext, grants: readonly RoleAssignment[], permission: string, resourceOrganizationId?: string): Promise<AccessDecision> {
  const reader = new InMemoryAuthorizationGrantReader([[identity.membershipId, grants]]);
  return new AuthorizePermissionUseCase(reader).execute({
    identity,
    permission,
    context: resourceOrganizationId ? { resourceOrganizationId } : undefined,
  });
}

describe('identity to authorization convergence', () => {
  it('allows an organization grant for the matching resource organization', async () => {
    const identity = await resolveIdentity();
    const decision = await authorize(identity, [role({ scope: 'ORGANIZATION', organizationId: 'org-a', permissionKeys: ['campaigns.manage'] })], 'campaigns.manage', 'org-a');
    expect(decision).toEqual({ allowed: true, reason: 'ALLOWED' });
  });

  it('denies an organization grant for a different resource organization', async () => {
    const identity = await resolveIdentity();
    const decision = await authorize(identity, [role({ scope: 'ORGANIZATION', organizationId: 'org-a', permissionKeys: ['campaigns.manage'] })], 'campaigns.manage', 'org-b');
    expect(decision).toEqual({ allowed: false, reason: 'WRONG_ORGANIZATION' });
  });

  it('rejects inactive identity resolution and denies inactive membership contexts', async () => {
    const suspendedUser = User.create({ id: user.id, status: 'SUSPENDED' });
    await expect(resolveIdentity(suspendedUser)).rejects.toMatchObject({ code: 'USER_INACTIVE' });
    const identity = await resolveIdentity();
    const decision = await authorize({ ...identity, membershipStatus: 'SUSPENDED' }, [role({ permissionKeys: ['runtime.publish'] })], 'runtime.publish');
    expect(decision).toEqual({ allowed: false, reason: 'NO_ACTIVE_MEMBERSHIP' });
  });

  it('denies a permission absent from the resolved grants', async () => {
    const identity = await resolveIdentity();
    const decision = await authorize(identity, [role({ permissionKeys: ['runtime.read'] })], 'runtime.publish');
    expect(decision).toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });

  it('allows a global permission without relying on the role name', async () => {
    const identity = await resolveIdentity();
    const decision = await authorize(identity, [role({ roleKey: 'OPERATOR', isSystem: true, permissionKeys: ['runtime.publish'] })], 'runtime.publish');
    expect(decision).toEqual({ allowed: true, reason: 'ALLOWED' });
  });

  it('denies a powerful role name without the requested permission', async () => {
    const identity = await resolveIdentity();
    const decision = await authorize(identity, [role({ roleKey: 'ADMIN', isSystem: true, permissionKeys: ['runtime.read'] })], 'runtime.publish');
    expect(decision).toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });
});
