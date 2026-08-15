import type pg from 'pg';
import { PERMISSION_KEYS, type PermissionKey } from '../../domain/authorization/PermissionKey';

type Permission = { key: PermissionKey; description: string };
type Role = { id: string; key: string; name: string; permissions: readonly PermissionKey[] };

const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  'users.read': 'Read user identity records',
  'users.manage': 'Manage user identity state',
  'wallet.read': 'Read wallet balances and ledger views',
  'wallet.adjust': 'Adjust wallet balances through authorized workflows',
  'economy.read': 'Read economy policies and budgets',
  'economy.manage': 'Manage economy policies and budgets',
  'runtime.read': 'Read runtime configuration',
  'runtime.publish': 'Publish runtime configuration',
  'models.read': 'Read model catalog entries',
  'models.manage': 'Manage model catalog entries',
  'providers.read': 'Read provider configuration metadata',
  'providers.manage': 'Manage provider configuration metadata',
  'cms.read': 'Read managed content',
  'cms.publish': 'Publish managed content',
  'campaigns.read': 'Read campaign records',
  'campaigns.manage': 'Manage campaign records',
  'audit.read': 'Read audit records',
};

const PERMISSIONS: Permission[] = PERMISSION_KEYS.map((key) => ({ key, description: PERMISSION_DESCRIPTIONS[key] }));

const ROLES: Role[] = [
  { id: 'role-user', key: 'USER', name: 'User', permissions: ['wallet.read', 'models.read'] },
  {
    id: 'role-owner', key: 'OWNER', name: 'Organization Owner',
    permissions: ['users.read', 'wallet.read', 'runtime.read', 'models.read', 'campaigns.read', 'campaigns.manage'],
  },
  {
    id: 'role-operator', key: 'OPERATOR', name: 'RouterGo Operator',
    permissions: PERMISSIONS.map((permission) => permission.key),
  },
  { id: 'role-advertiser-admin', key: 'ADVERTISER_ADMIN', name: 'Advertiser Administrator', permissions: ['campaigns.read', 'campaigns.manage', 'cms.read'] },
  { id: 'role-developer-admin', key: 'DEVELOPER_ADMIN', name: 'Developer Administrator', permissions: ['models.read', 'runtime.read'] },
];

async function seedPermissions(client: pg.PoolClient): Promise<void> {
  for (const permission of PERMISSIONS) {
    await client.query(
      `INSERT INTO permissions(id, permission_key, description, is_system)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (permission_key) DO UPDATE SET description=EXCLUDED.description, is_system=true`,
      [`permission-${permission.key}`, permission.key, permission.description],
    );
  }
}

async function seedRoles(client: pg.PoolClient): Promise<void> {
  for (const role of ROLES) {
    await client.query(
      `INSERT INTO roles(id, role_key, display_name, scope, organization_id, is_system)
       VALUES ($1, $2, $3, 'GLOBAL', NULL, true)
       ON CONFLICT (id) DO UPDATE SET role_key=EXCLUDED.role_key, display_name=EXCLUDED.display_name,
         scope=EXCLUDED.scope, organization_id=NULL, is_system=true`,
      [role.id, role.key, role.name],
    );
  }
}

async function seedRolePermissions(client: pg.PoolClient): Promise<void> {
  for (const role of ROLES) {
    for (const permission of role.permissions) {
      await client.query(
        `INSERT INTO role_permissions(role_id, permission_id)
         SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
         WHERE r.role_key=$1 AND p.permission_key=$2
         ON CONFLICT DO NOTHING`,
        [role.key, permission],
      );
    }
  }
}

export async function seedIdentity(client: pg.PoolClient): Promise<void> {
  await seedPermissions(client);
  await seedRoles(client);
  await seedRolePermissions(client);
}
