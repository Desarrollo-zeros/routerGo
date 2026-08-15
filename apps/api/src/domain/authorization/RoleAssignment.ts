import { isPermissionKey, type PermissionKey } from './PermissionKey';

export type RoleScope = 'GLOBAL' | 'ORGANIZATION';

export interface RoleAssignment {
  roleId: string;
  roleKey: string;
  scope: RoleScope;
  organizationId: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissionKeys: readonly PermissionKey[];
}

export interface UntrustedRoleAssignment extends Omit<RoleAssignment, 'permissionKeys'> {
  permissionKeys: readonly string[];
}

export function normalizeRoleAssignment(input: UntrustedRoleAssignment): RoleAssignment {
  const permissionKeys = [...new Set(input.permissionKeys.filter(isPermissionKey))];
  return { ...input, permissionKeys };
}
