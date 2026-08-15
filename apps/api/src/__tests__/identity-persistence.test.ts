import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { nanoid } from 'nanoid';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo',
});

afterAll(async () => pool.end());

describe('identity, RBAC and audit persistence', () => {
  it('preserves the existing user-wallet relationship and rejects duplicate membership', async () => {
    await withTransaction(async (client) => {
      const fixture = await createFixture(client, 'membership');
      const wallet = await client.query('SELECT user_id FROM wallets WHERE id=$1', [fixture.walletId]);

      expect(wallet.rows[0].user_id).toBe(fixture.userId);
      await expectRejected(
        client,
        `INSERT INTO organization_members(id, organization_id, user_id, status) VALUES ($1, $2, $3, 'ACTIVE')`,
        [`member-duplicate-${nanoid(6)}`, fixture.organizationId, fixture.userId],
      );
    });
  });

  it('enforces unique permission keys and important foreign keys', async () => {
    await withTransaction(async (client) => {
      const permissionKey = `identity.test.${nanoid(6)}`;
      await client.query(
        `INSERT INTO permissions(id, permission_key, description) VALUES ($1, $2, 'test permission')`,
        [`permission-${nanoid(6)}`, permissionKey],
      );
      await expectRejected(
        client,
        `INSERT INTO permissions(id, permission_key, description) VALUES ($1, $2, 'duplicate')`,
        [`permission-${nanoid(6)}`, permissionKey],
      );
      await expectRejected(
        client,
        `INSERT INTO organization_members(id, organization_id, user_id) VALUES ($1, $2, $3)`,
        [`member-${nanoid(6)}`, 'missing-organization', 'missing-user'],
      );
    });
  });

  it('keeps role-permission relations and prevents cross-organization role assignment', async () => {
    await withTransaction(async (client) => {
      const first = await createFixture(client, 'role-a');
      const second = await createFixture(client, 'role-b');
      const permissionId = `permission-${nanoid(6)}`;
      await client.query(
        `INSERT INTO permissions(id, permission_key, description) VALUES ($1, $2, 'role test')`,
        [permissionId, `role.test.${nanoid(6)}`],
      );
      await createOrganizationRole(client, first.organizationId, 'a');
      await createOrganizationRole(client, second.organizationId, 'b');
      await client.query(
        `INSERT INTO role_permissions(role_id, permission_id) SELECT $1, id FROM permissions WHERE id=$2`,
        [`role-a-${first.organizationId}`, permissionId],
      );
      const relation = await client.query(
        `SELECT p.permission_key FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=$1`,
        [`role-a-${first.organizationId}`],
      );
      expect(relation.rows[0].permission_key).toContain('role.test.');
      await client.query(
        `INSERT INTO member_roles(member_id, role_id) VALUES ($1, $2)`,
        [first.memberId, `role-a-${first.organizationId}`],
      );
      await expectRejected(
        client,
        `INSERT INTO member_roles(member_id, role_id) VALUES ($1, $2)`,
        [first.memberId, `role-b-${second.organizationId}`],
      );
    });
  });

  it('persists sanitized audit context and prevents mutation or deletion', async () => {
    await withTransaction(async (client) => {
      const fixture = await createFixture(client, 'audit');
      const auditId = `audit-${nanoid(8)}`;
      await client.query(
        `INSERT INTO audit_logs(id, actor_user_id, actor_organization_id, action, resource_type, resource_id, metadata, correlation_id)
         VALUES ($1, $2, $3, 'identity.test', 'organization', $4, $5, $6)`,
        [auditId, fixture.userId, fixture.organizationId, fixture.organizationId, { source: 'test' }, `corr-${nanoid(6)}`],
      );
      const audit = await client.query('SELECT actor_user_id, resource_type, metadata FROM audit_logs WHERE id=$1', [auditId]);

      expect(audit.rows[0]).toMatchObject({ actor_user_id: fixture.userId, resource_type: 'organization', metadata: { source: 'test' } });
      await expectRejected(client, 'UPDATE audit_logs SET action=$1 WHERE id=$2', ['changed', auditId]);
      await expectRejected(client, 'DELETE FROM audit_logs WHERE id=$1', [auditId]);
      const columns = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='updated_at'`,
      );
      expect(columns.rows).toHaveLength(0);
    });
  });
});

type Fixture = { organizationId: string; userId: string; memberId: string; walletId: string };

async function createFixture(client: pg.PoolClient, label: string): Promise<Fixture> {
  const suffix = `${label}-${nanoid(6)}`;
  const organizationId = `org-${suffix}`;
  const userId = `user-${suffix}`;
  const memberId = `member-${suffix}`;
  const walletId = `wallet-${suffix}`;
  await client.query(
    `INSERT INTO organizations(id, name, slug, kind) VALUES ($1, $2, $3, 'PERSONAL')`,
    [organizationId, `Test ${label}`, organizationId],
  );
  await client.query('INSERT INTO users(id, email) VALUES ($1, $2)', [userId, `${userId}@test.local`]);
  await client.query('INSERT INTO wallets(id, user_id) VALUES ($1, $2)', [walletId, userId]);
  await client.query(
    `INSERT INTO organization_members(id, organization_id, user_id, status) VALUES ($1, $2, $3, 'ACTIVE')`,
    [memberId, organizationId, userId],
  );
  return { organizationId, userId, memberId, walletId };
}

async function createOrganizationRole(client: pg.PoolClient, organizationId: string, key: string): Promise<void> {
  await client.query(
    `INSERT INTO roles(id, role_key, display_name, scope, organization_id) VALUES ($1, $2, $3, 'ORGANIZATION', $4)`,
    [`role-${key}-${organizationId}`, key, key, organizationId],
  );
}

async function withTransaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    return await callback(client);
  } finally {
    await client.query('ROLLBACK');
    client.release();
  }
}

async function expectRejected(client: pg.PoolClient, sql: string, values: unknown[]): Promise<void> {
  await client.query('SAVEPOINT expected_failure');
  await expect(client.query(sql, values)).rejects.toThrow();
  await client.query('ROLLBACK TO SAVEPOINT expected_failure');
  await client.query('RELEASE SAVEPOINT expected_failure');
}
