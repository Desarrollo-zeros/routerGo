import { describe, expect, it } from 'vitest';
import type pg from 'pg';
import { PostgresAuthorizationGrantReader } from './PostgresAuthorizationGrantReader.js';

describe('PostgresAuthorizationGrantReader', () => {
  it('maps persisted roles and filters unknown permission keys', async () => {
    const pool = { query: async () => ({ rows: [{ role_id: 'role-operator', role_key: 'OPERATOR', scope: 'GLOBAL', organization_id: null, is_system: true, permission_keys: ['runtime.publish', 'not-a-permission'] }] }) };
    await expect(new PostgresAuthorizationGrantReader(pool as unknown as pg.Pool).findRoleAssignments('member-1')).resolves.toEqual([expect.objectContaining({ roleId: 'role-operator', permissionKeys: ['runtime.publish'] })]);
  });
});
