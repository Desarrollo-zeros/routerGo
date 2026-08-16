import { describe, expect, it } from 'vitest';
import { PERMISSION_KEYS } from './PermissionKey.js';
import { AuthorizationPolicy } from './AuthorizationPolicy.js';
import { normalizeRoleAssignment, type RoleAssignment } from './RoleAssignment.js';
import type { AuthorizationSubject } from './AuthorizationSubject.js';

const policy = new AuthorizationPolicy();

function role(overrides: Partial<RoleAssignment> = {}): RoleAssignment {
  return {
    roleId: 'role-1',
    roleKey: 'CUSTOM',
    scope: 'GLOBAL',
    organizationId: null,
    isSystem: false,
    isActive: true,
    permissionKeys: [],
    ...overrides,
  };
}

function subject(roles: readonly RoleAssignment[] = []): AuthorizationSubject {
  return {
    userId: 'user-1',
    membershipId: 'member-a',
    organizationId: 'org-a',
    membershipStatus: 'ACTIVE',
    roles,
  };
}

describe('AuthorizationPolicy', () => {
  it('allows an explicit permission', () => {
    const result = policy.can(subject([role({ permissionKeys: ['runtime.publish'] })]), 'runtime.publish');
    expect(result).toEqual({ allowed: true, reason: 'ALLOWED' });
  });

  it('denies a missing permission and empty grants', () => {
    expect(policy.can(subject(), 'runtime.publish')).toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
    expect(policy.can(subject([role({ permissionKeys: ['runtime.read'] })]), 'runtime.publish'))
      .toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });

  it('does not treat a powerful role name as authority', () => {
    const result = policy.can(subject([role({ roleKey: 'SUPER_ADMIN' })]), 'providers.manage');
    expect(result).toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });

  it('allows a global grant for resources in any organization', () => {
    const global = role({ permissionKeys: ['runtime.publish'], isSystem: true });
    expect(policy.can(subject([global]), 'runtime.publish', { resourceOrganizationId: 'org-a' }).allowed).toBe(true);
    expect(policy.can(subject([global]), 'runtime.publish', { resourceOrganizationId: 'org-b' }).allowed).toBe(true);
  });

  it('allows an organization grant only for its organization', () => {
    const scoped = role({
      roleKey: 'ADVERTISER_ADMIN',
      scope: 'ORGANIZATION',
      organizationId: 'org-a',
      permissionKeys: ['campaigns.manage'],
    });
    expect(policy.can(subject([scoped]), 'campaigns.manage', { resourceOrganizationId: 'org-a' }).allowed).toBe(true);
    expect(policy.can(subject([scoped]), 'campaigns.manage', { resourceOrganizationId: 'org-b' }))
      .toEqual({ allowed: false, reason: 'WRONG_ORGANIZATION' });
    expect(policy.can(subject([scoped]), 'campaigns.manage'))
      .toEqual({ allowed: false, reason: 'WRONG_ORGANIZATION' });
  });

  it('denies inactive memberships', () => {
    expect(policy.can({ ...subject(), membershipStatus: 'SUSPENDED' }, 'runtime.publish'))
      .toEqual({ allowed: false, reason: 'NO_ACTIVE_MEMBERSHIP' });
  });

  it('denies an inactive role even when it has the permission', () => {
    const result = policy.can(subject([role({ isActive: false, permissionKeys: ['runtime.publish'] })]), 'runtime.publish');
    expect(result).toEqual({ allowed: false, reason: 'INACTIVE_ROLE' });
  });

  it('combines permissions from multiple roles', () => {
    const roles = [
      role({ roleId: 'read', permissionKeys: ['runtime.read'] }),
      role({ roleId: 'publish', permissionKeys: ['runtime.publish'] }),
    ];
    expect(policy.can(subject(roles), 'runtime.read').allowed).toBe(true);
    expect(policy.can(subject(roles), 'runtime.publish').allowed).toBe(true);
  });

  it('does not change when a role repeats a permission', () => {
    const single = policy.can(subject([role({ permissionKeys: ['runtime.publish'] })]), 'runtime.publish');
    const repeated = policy.can(subject([role({ permissionKeys: ['runtime.publish', 'runtime.publish'] })]), 'runtime.publish');
    expect(repeated).toEqual(single);
  });

  it('denies unknown permissions and does not support wildcards', () => {
    expect(policy.can(subject([role({ permissionKeys: ['runtime.publish'] })]), 'admin.*'))
      .toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
    expect(policy.can(subject([role({ permissionKeys: ['runtime.publish'] })]), 'unknown.permission'))
      .toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });

  it('keeps advertiser grants away from operator capabilities', () => {
    const advertiser = role({
      roleKey: 'ADVERTISER_ADMIN',
      permissionKeys: ['campaigns.read', 'campaigns.manage', 'cms.read'],
    });
    expect(policy.can(subject([advertiser]), 'campaigns.manage').allowed).toBe(true);
    expect(policy.can(subject([advertiser]), 'runtime.publish'))
      .toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
    expect(policy.can(subject([advertiser]), 'providers.manage'))
      .toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });

  it('does not turn system metadata into a wildcard', () => {
    const systemRole = role({ isSystem: true, roleKey: 'SYSTEM_METADATA_ONLY' });
    expect(policy.can(subject([systemRole]), 'users.manage'))
      .toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });

  it('normalizes unknown and duplicate grants without widening access', () => {
    const normalized = normalizeRoleAssignment({
      ...role(),
      permissionKeys: ['runtime.publish', 'runtime.publish', 'unknown.permission'],
    });
    expect(normalized.permissionKeys).toEqual(['runtime.publish']);
    expect(policy.can(subject([normalized]), 'runtime.publish').allowed).toBe(true);
    expect(policy.can(subject([normalized]), 'unknown.permission'))
      .toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });

  it('keeps the seeded permission vocabulary explicit', () => {
    expect(PERMISSION_KEYS).toHaveLength(21);
    expect(PERMISSION_KEYS).not.toContain('*');
    expect(PERMISSION_KEYS).not.toContain('admin.*');
  });
});
