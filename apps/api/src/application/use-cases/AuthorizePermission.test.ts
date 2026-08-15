import { describe, expect, it } from 'vitest';
import { AuthorizePermissionUseCase } from './AuthorizePermission.js';
import { InMemoryAuthorizationGrantReader } from '../testing/InMemoryAuthorizationGrantReader.js';
import type { RoleAssignment } from '../../domain/authorization/RoleAssignment.js';

function role(permissionKeys: readonly RoleAssignment['permissionKeys'][number][]): RoleAssignment {
  return {
    roleId: 'role-1',
    roleKey: 'CUSTOM',
    scope: 'GLOBAL',
    organizationId: null,
    isSystem: false,
    isActive: true,
    permissionKeys,
  };
}

describe('AuthorizePermissionUseCase', () => {
  it('resolves all grants in one membership read before pure evaluation', async () => {
    const reader = new InMemoryAuthorizationGrantReader([
      ['member-a', [role(['runtime.publish'])]],
    ]);
    const useCase = new AuthorizePermissionUseCase(reader);
    const result = await useCase.execute({
      subject: {
        userId: 'user-1',
        membershipId: 'member-a',
        organizationId: 'org-a',
        isActive: true,
        membershipIsActive: true,
      },
      permission: 'runtime.publish',
    });
    expect(result).toEqual({ allowed: true, reason: 'ALLOWED' });
  });

  it('denies when the membership has no resolved grants', async () => {
    const useCase = new AuthorizePermissionUseCase(new InMemoryAuthorizationGrantReader());
    const result = await useCase.execute({
      subject: {
        userId: 'user-1',
        membershipId: 'member-a',
        organizationId: 'org-a',
        isActive: true,
        membershipIsActive: true,
      },
      permission: 'runtime.publish',
    });
    expect(result).toEqual({ allowed: false, reason: 'MISSING_PERMISSION' });
  });
});
