import { describe, expect, it } from 'vitest';
import { User } from '../../domain/entities/User';
import { Organization } from '../../domain/entities/Organization';
import { OrganizationMember } from '../../domain/entities/OrganizationMember';
import { OrganizationSlug } from '../../domain/value-objects/OrganizationSlug';
import type { UserRepository } from '../ports/outbound/UserRepository';
import { identityRepositories, type IdentityRepositories } from '../testing/InMemoryIdentityRepositories';
import { GetUserUseCase } from './GetUser';
import { GetOrganizationUseCase } from './GetOrganization';
import { ListUserMembershipsUseCase } from './ListUserMemberships';
import { ResolveIdentityContextUseCase } from './ResolveIdentityContext';
import { IdentityError } from '../errors/IdentityError';

const user = User.create({ id: 'user-1', status: 'ACTIVE' });
const organization = Organization.create({ id: 'org-1', name: 'Personal', slug: OrganizationSlug.create('personal'), kind: 'PERSONAL', status: 'ACTIVE' });
const membership = OrganizationMember.create({ id: 'member-1', userId: user.id, organizationId: organization.id, status: 'ACTIVE' });

function repositories(): IdentityRepositories {
  return identityRepositories([user], [organization], [membership]);
}

describe('identity application contracts', () => {
  it('gets a user and maps absence to USER_NOT_FOUND', async () => {
    const { users } = repositories();
    expect((await new GetUserUseCase(users).execute({ userId: user.id })).id).toBe(user.id);
    await expect(new GetUserUseCase(users).execute({ userId: 'missing' })).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('gets an organization and maps absence to ORGANIZATION_NOT_FOUND', async () => {
    const { organizations } = repositories();
    expect((await new GetOrganizationUseCase(organizations).execute({ organizationId: organization.id })).id).toBe(organization.id);
    await expect(new GetOrganizationUseCase(organizations).execute({ organizationId: 'missing' })).rejects.toMatchObject({ code: 'ORGANIZATION_NOT_FOUND' });
  });

  it('resolves active identity context and lists memberships', async () => {
    const repos = repositories();
    const context = await new ResolveIdentityContextUseCase(repos.users, repos.organizations, repos.memberships).execute({ userId: user.id, organizationId: organization.id });
    expect(context).toEqual({ userId: user.id, organizationId: organization.id, membershipId: membership.id, membershipStatus: 'ACTIVE' });
    expect(await new ListUserMembershipsUseCase(repos.users, repos.memberships).execute({ userId: user.id })).toEqual([membership]);
  });

  it.each([
    ['inactive user', User.create({ id: user.id, status: 'SUSPENDED' }), organization, membership, 'USER_INACTIVE'],
    ['inactive organization', user, Organization.create({ id: organization.id, name: organization.name, slug: organization.slug, kind: organization.kind, status: 'DISABLED' }), membership, 'ORGANIZATION_INACTIVE'],
    ['inactive membership', user, organization, OrganizationMember.create({ id: membership.id, userId: user.id, organizationId: organization.id, status: 'REMOVED' }), 'MEMBERSHIP_INACTIVE'],
  ])('rejects %s during context resolution', async (_label, currentUser, currentOrganization, currentMembership, code) => {
    const repos = identityRepositories([currentUser], [currentOrganization], [currentMembership]);
    const context = new ResolveIdentityContextUseCase(repos.users, repos.organizations, repos.memberships);
    await expect(context.execute({ userId: user.id, organizationId: organization.id })).rejects.toMatchObject({ code });
  });

  it('maps missing membership and propagates repository failures', async () => {
    const repos = repositories();
    const emptyMemberships = identityRepositories([], [], []).memberships;
    const context = new ResolveIdentityContextUseCase(repos.users, repos.organizations, emptyMemberships);
    await expect(context.execute({ userId: user.id, organizationId: organization.id })).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND' });
    const failure = new Error('storage unavailable');
    await expect(new GetUserUseCase(new FailingUsers(failure)).execute({ userId: user.id })).rejects.toBe(failure);
  });
});

class FailingUsers implements UserRepository {
  constructor(private readonly failure: Error) {}
  async findById(_id: string): Promise<User | null> { throw this.failure; }
}
