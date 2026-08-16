import { describe, expect, it } from 'vitest';
import type pg from 'pg';
import { PostgresApiKeyIdentityResolver } from './PostgresApiKeyIdentityResolver.js';

describe('PostgresApiKeyIdentityResolver', () => {
  it('maps the active client membership into the small identity context', async () => {
    const pool = { query: async () => ({ rows: [{ membership_id: 'member-1', organization_id: 'org-1', membership_status: 'ACTIVE' }] }) };
    const context = { userId: 'user-1', walletId: 'wallet-1', clientId: 'client-1', keyId: 'key-1', scopes: ['runtime.publish'] };
    await expect(new PostgresApiKeyIdentityResolver(pool as unknown as pg.Pool).resolve(context)).resolves.toEqual({ userId: 'user-1', organizationId: 'org-1', membershipId: 'member-1', membershipStatus: 'ACTIVE' });
  });
});
