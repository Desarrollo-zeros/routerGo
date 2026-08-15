import { describe, expect, it } from 'vitest';
import { User } from './User';
import { Organization } from './Organization';
import { OrganizationMember } from './OrganizationMember';
import { OrganizationSlug } from '../value-objects/OrganizationSlug';

const now = new Date('2026-08-15T00:00:00.000Z');

function activeUser(): User {
  return User.create({ id: 'user-1', status: 'ACTIVE' });
}

function activeOrganization(): Organization {
  return Organization.create({
    id: 'org-1', name: 'Personal', slug: OrganizationSlug.create('personal'), kind: 'PERSONAL', status: 'ACTIVE',
  });
}

function activeMember(): OrganizationMember {
  return OrganizationMember.create({ id: 'member-1', userId: 'user-1', organizationId: 'org-1', status: 'ACTIVE' });
}

describe('identity domain', () => {
  it('recognizes an active user, organization, and membership', () => {
    expect(activeUser().isActive()).toBe(true);
    expect(activeOrganization().isActive()).toBe(true);
    expect(activeMember().isActiveFor(activeUser(), activeOrganization())).toBe(true);
  });

  it.each([
    ['suspended user', User.create({ id: 'user-1', status: 'SUSPENDED' })],
    ['deleted user', User.create({ id: 'user-1', status: 'DELETED' })],
  ])('%s is not active', (_label, user) => expect(user.isActive()).toBe(false));

  it.each([
    ['suspended organization', Organization.create({ id: 'org-1', name: 'Org', slug: OrganizationSlug.create('org'), kind: 'INTERNAL', status: 'SUSPENDED' })],
    ['disabled organization', Organization.create({ id: 'org-1', name: 'Org', slug: OrganizationSlug.create('org'), kind: 'INTERNAL', status: 'DISABLED' })],
  ])('%s is not active', (_label, organization) => expect(organization.isActive()).toBe(false));

  it('rejects an inactive membership and mismatched ownership', () => {
    const member = OrganizationMember.create({ id: 'member-1', userId: 'user-1', organizationId: 'org-1', status: 'SUSPENDED' });
    expect(member.isActiveFor(activeUser(), activeOrganization())).toBe(false);
    expect(activeMember().isActiveFor(User.create({ id: 'other', status: 'ACTIVE' }), activeOrganization())).toBe(false);
  });

  it('validates organization slugs and required identity identifiers', () => {
    expect(OrganizationSlug.create('My Org').value).toBe('my-org');
    expect(() => OrganizationSlug.create('bad slug!')).toThrow();
    expect(() => User.create({ id: '', status: 'ACTIVE' })).toThrow();
    expect(() => OrganizationMember.create({ id: 'm', userId: '', organizationId: 'o', status: 'ACTIVE' })).toThrow();
  });
});
