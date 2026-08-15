import type pg from 'pg';

type Permission = { key: string; description: string };
type Role = { id: string; key: string; name: string; permissions: string[] };

const PERMISSIONS: Permission[] = [
  { key: 'users.read', description: 'Read user identity records' },
  { key: 'users.manage', description: 'Manage user identity state' },
  { key: 'wallet.read', description: 'Read wallet balances and ledger views' },
  { key: 'wallet.adjust', description: 'Adjust wallet balances through authorized workflows' },
  { key: 'economy.read', description: 'Read economy policies and budgets' },
  { key: 'economy.manage', description: 'Manage economy policies and budgets' },
  { key: 'runtime.read', description: 'Read runtime configuration' },
  { key: 'runtime.publish', description: 'Publish runtime configuration' },
  { key: 'models.read', description: 'Read model catalog entries' },
  { key: 'models.manage', description: 'Manage model catalog entries' },
  { key: 'providers.read', description: 'Read provider configuration metadata' },
  { key: 'providers.manage', description: 'Manage provider configuration metadata' },
  { key: 'cms.read', description: 'Read managed content' },
  { key: 'cms.publish', description: 'Publish managed content' },
  { key: 'campaigns.read', description: 'Read campaign records' },
  { key: 'campaigns.manage', description: 'Manage campaign records' },
  { key: 'audit.read', description: 'Read audit records' },
];

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
