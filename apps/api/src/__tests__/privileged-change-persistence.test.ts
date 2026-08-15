import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import type { PoolClient } from 'pg';
import { nanoid } from 'nanoid';
import type { IdentityContext } from '../application/contracts/IdentityContext';
import type { PrivilegedChangeCommand } from '../application/contracts/PrivilegedChange';
import { PrivilegedChangeError } from '../application/errors/PrivilegedChangeError';
import { FixedClock } from '../application/ports/outbound/Clock';
import type { PrivilegedChangeScope } from '../application/ports/outbound/PrivilegedChangeUnitOfWork';
import { PrivilegedChangeService } from '../application/services/PrivilegedChangeService';
import { PgPrivilegedChangeUnitOfWork } from '../infrastructure/adapters/postgres/PgPrivilegedChangeUnitOfWork';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });

interface FeatureFlagScope extends PrivilegedChangeScope {
  featureFlags: { insert(key: string): Promise<void> };
}

interface IdentityFixture {
  userId: string;
  organizationId: string;
  membershipId: string;
}

const now = new Date('2026-08-15T22:00:00.000Z');

afterAll(async () => pool.end());

function createService(): PrivilegedChangeService<FeatureFlagScope> {
  const unitOfWork = new PgPrivilegedChangeUnitOfWork<FeatureFlagScope>(pool, (client, base) => ({
    ...base,
    featureFlags: { insert: (key) => insertFeatureFlag(client, key) },
  }));
  return new PrivilegedChangeService(unitOfWork, new FixedClock(now));
}

async function insertFeatureFlag(client: PoolClient, key: string): Promise<void> {
  await client.query(
    `INSERT INTO feature_flags(key, default_value, rollout_json, enabled)
     VALUES ($1, false, '{}'::jsonb, true)`,
    [key],
  );
}

async function createIdentityFixture(): Promise<IdentityFixture> {
  const suffix = nanoid(10);
  const fixture = { userId: `t013-user-${suffix}`, organizationId: `t013-org-${suffix}`, membershipId: `t013-member-${suffix}` };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO users(id, email, status) VALUES ($1, $2, $3)', [fixture.userId, `${suffix}@t013.test`, 'ACTIVE']);
    await client.query(
      `INSERT INTO organizations(id, name, slug, kind, status) VALUES ($1, $2, $3, 'INTERNAL', 'ACTIVE')`,
      [fixture.organizationId, `T013 ${suffix}`, `t013-${suffix}`],
    );
    await client.query(
      `INSERT INTO organization_members(id, organization_id, user_id, status) VALUES ($1, $2, $3, 'ACTIVE')`,
      [fixture.membershipId, fixture.organizationId, fixture.userId],
    );
    await client.query('COMMIT');
    return fixture;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function cleanup(fixture: IdentityFixture, featureKey: string, operationId: string): Promise<void> {
  await pool.query('DELETE FROM feature_flags WHERE key = $1', [featureKey]);
  await pool.query('DELETE FROM outbox_events WHERE id = $1', [`outbox:${operationId}`]);
  await pool.query('DELETE FROM organization_members WHERE id = $1', [fixture.membershipId]);
}

function command(fixture: IdentityFixture, operationId: string, featureKey: string, mutate?: PrivilegedChangeCommand<string, FeatureFlagScope>['mutate']): PrivilegedChangeCommand<string, FeatureFlagScope> {
  const identity: IdentityContext = { ...fixture, membershipStatus: 'ACTIVE' };
  return {
    identity,
    decision: { allowed: true, reason: 'ALLOWED' },
    operationId,
    correlationId: `correlation-${operationId}`,
    action: 'runtime.publish',
    resource: { type: 'feature_flag', id: featureKey },
    metadata: { source: 't013-integration', password: 'dummy' },
    event: { eventType: 'runtime.config.published.v1', aggregateType: 'feature_flag', aggregateId: featureKey, payload: { enabled: true } },
    mutate: mutate ?? (async (scope) => { await scope.featureFlags.insert(featureKey); return featureKey; }),
  };
}

describe('privileged change PostgreSQL boundary', () => {
  it('commits mutation, audit, and outbox in one transaction', async () => {
    const fixture = await createIdentityFixture();
    const operationId = `t013-commit-${nanoid(10)}`;
    const featureKey = `t013-flag-${nanoid(10)}`;
    try {
      await createService().execute(command(fixture, operationId, featureKey));
      const result = await pool.query('SELECT key FROM feature_flags WHERE key = $1', [featureKey]);
      const audit = await pool.query('SELECT correlation_id, metadata FROM audit_logs WHERE id = $1', [operationId]);
      const outbox = await pool.query('SELECT event_type, aggregate_id, payload_json FROM outbox_events WHERE id = $1', [`outbox:${operationId}`]);
      expect(result.rowCount).toBe(1);
      expect(audit.rows[0]).toMatchObject({ correlation_id: `correlation-${operationId}`, metadata: { source: 't013-integration', authorizationReason: 'ALLOWED' } });
      expect(audit.rows[0]?.metadata.password).toBeUndefined();
      expect(outbox.rows[0]).toMatchObject({ event_type: 'runtime.config.published.v1', aggregate_id: featureKey });
    } finally {
      await cleanup(fixture, featureKey, operationId);
    }
  });

  it('rolls back mutation, audit, and outbox together when mutation fails', async () => {
    const fixture = await createIdentityFixture();
    const operationId = `t013-rollback-${nanoid(10)}`;
    const featureKey = `t013-flag-${nanoid(10)}`;
    try {
      await expect(createService().execute(command(fixture, operationId, featureKey, async (scope) => {
        await scope.featureFlags.insert(featureKey);
        throw new Error('mutation failed');
      }))).rejects.toThrow('mutation failed');
      const feature = await pool.query('SELECT key FROM feature_flags WHERE key = $1', [featureKey]);
      const audit = await pool.query('SELECT id FROM audit_logs WHERE id = $1', [operationId]);
      const outbox = await pool.query('SELECT id FROM outbox_events WHERE id = $1', [`outbox:${operationId}`]);
      expect(feature.rowCount).toBe(0);
      expect(audit.rowCount).toBe(0);
      expect(outbox.rowCount).toBe(0);
    } finally {
      await cleanup(fixture, featureKey, operationId);
    }
  });

  it('rejects a duplicate operation without repeating the mutation', async () => {
    const fixture = await createIdentityFixture();
    const operationId = `t013-duplicate-${nanoid(10)}`;
    const featureKey = `t013-flag-${nanoid(10)}`;
    let mutationCalls = 0;
    try {
      const service = createService();
      const execute = () => service.execute(command(fixture, operationId, featureKey, async (scope) => {
        mutationCalls += 1;
        await scope.featureFlags.insert(featureKey);
        return featureKey;
      }));
      await execute();
      await expect(execute()).rejects.toMatchObject({ code: 'DUPLICATE_OPERATION' } satisfies Partial<PrivilegedChangeError>);
      const counts = await pool.query(
        `SELECT (SELECT count(*) FROM feature_flags WHERE key = $1) AS feature_count,
                (SELECT count(*) FROM audit_logs WHERE id = $2) AS audit_count,
                (SELECT count(*) FROM outbox_events WHERE id = $3) AS outbox_count`,
        [featureKey, operationId, `outbox:${operationId}`],
      );
      expect(mutationCalls).toBe(1);
      expect(counts.rows[0]).toEqual({ feature_count: '1', audit_count: '1', outbox_count: '1' });
    } finally {
      await cleanup(fixture, featureKey, operationId);
    }
  });
});
