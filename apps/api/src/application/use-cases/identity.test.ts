import { describe, expect, it } from 'vitest';
import { User } from '../../domain/entities/User';
import { Organization } from '../../domain/entities/Organization';
import { OrganizationMember } from '../../domain/entities/OrganizationMember';
import { OrganizationSlug } from '../../domain/value-objects/OrganizationSlug';
import type { UserRepository } from '../ports/outbound/UserRepository';
import type { OrganizationRepository } from '../ports/outbound/OrganizationRepository';
import type { MembershipRepository } from '../ports/outbound/MembershipRepository';
import { GetUserUseCase } from './GetUser';
import { GetOrganizationUseCase } from './GetOrganization';
import { ListUserMembershipsUseCase } from './ListUserMemberships';
import { ResolveIdentityContextUseCase } from './ResolveIdentityContext';
import { IdentityError } from '../errors/IdentityError';

const user = User.create({ id: 'user-1', status: 'ACTIVE' });
const organization = Organization.create({ id: 'org-1', name: 'Personal', slug: OrganizationSlug.create('personal'), kind: 'PERSONAL', status: 'ACTIVE' });
const membership = OrganizationMember.create({ id: 'member-1', userId: user.id, organizationId: organization.id, status: 'ACTIVE' });

function repositories(): { users: FakeUsers; organizations: FakeOrganizations; memberships: FakeMemberships } {
  return { users: new FakeUsers([user]), organizations: new FakeOrganizations([organization]), memberships: new FakeMemberships([membership]) };
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
    const context = new ResolveIdentityContextUseCase(new FakeUsers([currentUser]), new FakeOrganizations([currentOrganization]), new FakeMemberships([currentMembership]));
    await expect(context.execute({ userId: user.id, organizationId: organization.id })).rejects.toMatchObject({ code });
  });

  it('maps missing membership and propagates repository failures', async () => {
    const repos = repositories();
    const context = new ResolveIdentityContextUseCase(repos.users, repos.organizations, new FakeMemberships([]));
    await expect(context.execute({ userId: user.id, organizationId: organization.id })).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND' });
    const failure = new Error('storage unavailable');
    await expect(new GetUserUseCase(new FailingUsers(failure)).execute({ userId: user.id })).rejects.toBe(failure);
  });
});

class FakeUsers implements UserRepository {
  constructor(private readonly values: User[]) {}
  async findById(id: string): Promise<User | null> { return this.values.find((value) => value.id === id) ?? null; }
}

class FailingUsers implements UserRepository {
  constructor(private readonly failure: Error) {}
  async findById(_id: string): Promise<User | null> { throw this.failure; }
}

class FakeOrganizations implements OrganizationRepository {
  constructor(private readonly values: Organization[]) {}
  async findById(id: string): Promise<Organization | null> { return this.values.find((value) => value.id === id) ?? null; }
}

class FakeMemberships implements MembershipRepository {
  constructor(private readonly values: OrganizationMember[]) {}
  async findById(id: string): Promise<OrganizationMember | null> { return this.values.find((value) => value.id === id) ?? null; }
  async findByUserAndOrganization(userId: string, organizationId: string): Promise<OrganizationMember | null> {
    return this.values.find((value) => value.userId === userId && value.organizationId === organizationId) ?? null;
  }
  async findByUserId(userId: string): Promise<OrganizationMember[]> { return this.values.filter((value) => value.userId === userId); }
}
