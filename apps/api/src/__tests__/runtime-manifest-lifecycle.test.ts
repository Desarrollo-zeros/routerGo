import pg from 'pg';
import Redis from 'ioredis';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { nanoid } from 'nanoid';
import { allow } from '../domain/authorization/AccessDecision';
import { SystemClock } from '../application/ports/outbound/Clock';
import { PrivilegedChangeService } from '../application/services/PrivilegedChangeService';
import { PublishRuntimeManifest } from '../application/use-cases/PublishRuntimeManifest';
import { RollbackRuntimeManifest } from '../application/use-cases/RollbackRuntimeManifest';
import type { RuntimeManifestCache, RuntimeManifestChangeScope, RuntimeManifestSourceReader, RuntimeManifestTelemetry } from '../application/ports/outbound/RuntimeManifestPorts';
import { RuntimeManifestSourcePostgresAdapter } from '../infrastructure/adapters/postgres/RuntimeManifestSourcePostgresAdapter';
import { RuntimeManifestPostgresStore } from '../infrastructure/adapters/postgres/RuntimeManifestPostgresStore';
import { ActiveRuntimeManifestReader } from '../infrastructure/adapters/postgres/ActiveRuntimeManifestReader';
import { RedisManifestCacheAdapter } from '../infrastructure/adapters/redis/RedisManifestCacheAdapter';
import type { PublishedRuntimeManifest } from '../application/ports/outbound/RuntimeManifestPorts';
import { PgPrivilegedChangeUnitOfWork } from '../infrastructure/adapters/postgres/PgPrivilegedChangeUnitOfWork';
import { loadRuntimeManifest } from '../config/RuntimeManifest';
import { toWebManifest } from '../infrastructure/http/bootstrap';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
let baseline = 1;
let actor: { userId: string; organizationId: string; membershipId: string };

beforeAll(async () => {
  const active = await pool.query<{ active_version: string }>("SELECT active_version FROM runtime_manifest_state WHERE id='active'");
  baseline = Number(active.rows[0]?.active_version ?? 1);
  const suffix = nanoid(8);
  actor = { userId: `t015-user-${suffix}`, organizationId: `t015-org-${suffix}`, membershipId: `t015-member-${suffix}` };
  await pool.query('INSERT INTO users(id,email) VALUES ($1,$2)', [actor.userId, `${actor.userId}@test.local`]);
  await pool.query('INSERT INTO organizations(id,name,slug,kind) VALUES ($1,$2,$3,\'INTERNAL\')', [actor.organizationId, 'T015', actor.organizationId]);
  await pool.query(
    "INSERT INTO organization_members(id,organization_id,user_id,status) VALUES ($1,$2,$3,'ACTIVE')",
    [actor.membershipId, actor.organizationId, actor.userId],
  );
});

afterEach(async () => {
  await pool.query("UPDATE runtime_manifest_state SET active_version=$1 WHERE id='active'", [baseline]);
});

afterAll(async () => pool.end());

describe.sequential('runtime manifest lifecycle', () => {
  it('publishes a separated API/UI public contract', async () => {
    const web = toWebManifest(await loadRuntimeManifest(pool));
    const ui = web.ui as { routes: Array<Record<string, unknown>>; navigation: Array<Record<string, unknown>> };
    expect(web.apiRoutes).toBeDefined();
    expect(ui.routes[0]).toHaveProperty('screen_key');
    expect(ui.routes[0]).toHaveProperty('path');
    expect(ui.routes[0]).not.toHaveProperty('method');
    expect((web.apiRoutes as Array<Record<string, unknown>>)[0]).toHaveProperty('method');
    expect(web.feature_flags).toBeDefined();
    expect(web.catalog).toBeDefined();
    expect(ui.navigation.length).toBeGreaterThan(0);
  });

  it('loads a cache miss from PostgreSQL and refreshes the versioned cache', async () => {
    let cached: PublishedRuntimeManifest | null = null;
    let writes = 0;
    const cache = {
      read: async () => cached,
      sync: async (snapshot: PublishedRuntimeManifest) => { cached = snapshot; writes += 1; },
    };
    const reader = new ActiveRuntimeManifestReader(pool, cache, { cacheFailure: () => undefined });
    const first = await reader.read();
    const second = await reader.read();
    expect(first.version).toBe(baseline);
    expect(second.contentHash).toBe(first.contentHash);
    expect(writes).toBe(1);
  });

  it('round-trips the versioned Redis cache when local Redis is available', async () => {
    const redis = new Redis(process.env.ROUTERGO_REDIS_URL ?? 'redis://localhost:6380');
    const adapter = new RedisManifestCacheAdapter(redis, 30);
    const manifest = await loadRuntimeManifest(pool);
    const snapshot = { version: manifest.version, contentHash: manifest.contentHash!, manifest };
    await adapter.sync(snapshot);
    const cached = await adapter.read(snapshot.version);
    await redis.del(`manifest:${snapshot.version}`, 'manifest:current');
    await redis.quit();
    expect(cached?.contentHash).toBe(snapshot.contentHash);
  });

  it('publishes the next immutable version and moves the active pointer', async () => {
    const before = await latestVersion();
    const result = await publish();
    expect(result.version).toBe(before + 1);
    expect(await activeVersion()).toBe(result.version);
    expect(await snapshotExists(before)).toBe(true);
  });

  it('rejects a stale expected version before changing state', async () => {
    await expect(publish(999999)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(await activeVersion()).toBe(baseline);
  });

  it('does not duplicate a publication for the same operation id', async () => {
    const operationId = `t015-duplicate-${nanoid(8)}`;
    await publish(baseline, operationId);
    const version = await latestVersion();
    await expect(publish(undefined, operationId)).rejects.toMatchObject({ code: 'DUPLICATE_OPERATION' });
    expect(await latestVersion()).toBe(version);
  });

  it('serializes concurrent publications and prevents duplicate versions', async () => {
    const before = await latestVersion();
    const results = await Promise.allSettled([publish(baseline), publish(baseline)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await latestVersion()).toBe(before + 1);
  });

  it('rolls back the pointer while retaining newer snapshots', async () => {
    const published = await publish(baseline);
    const rolledBack = await rollback(baseline, published.version);
    expect(rolledBack.version).toBe(baseline);
    expect(await activeVersion()).toBe(baseline);
    expect(await snapshotExists(published.version)).toBe(true);
  });

  it('keeps durable publication successful when cache sync fails', async () => {
    const telemetry = { errors: 0, cacheFailure: () => { telemetry.errors += 1; } };
    const result = await publishWith({ sync: async () => { throw new Error('redis unavailable'); } }, telemetry);
    expect(result.version).toBeGreaterThan(baseline);
    expect(telemetry.errors).toBe(1);
    expect(await snapshotExists(result.version)).toBe(true);
  });

  it('rejects invalid relational references before publication', async () => {
    const source = await new RuntimeManifestSourcePostgresAdapter(pool).read();
    const invalid = { ...source, models: source.models.map((model, index) => index === 0 ? { ...model, gateway_id: 'missing' } : model) };
    const reader: RuntimeManifestSourceReader = { read: async () => invalid };
    await expect(publishWith(undefined, undefined, reader)).rejects.toMatchObject({ code: 'MANIFEST_INVALID' });
    expect(await activeVersion()).toBe(baseline);
  });

  it('records publish audit and outbox atomically', async () => {
    const operationId = `t015-audit-${nanoid(8)}`;
    const result = await publish(baseline, operationId);
    const audit = await pool.query('SELECT action, metadata FROM audit_logs WHERE id=$1', [operationId]);
    const event = await pool.query('SELECT event_type, payload_json FROM outbox_events WHERE id=$1', [`outbox:${operationId}`]);
    expect(audit.rows[0]).toMatchObject({ action: 'runtime.publish', metadata: { manifestVersion: result.version } });
    expect(event.rows[0]).toMatchObject({ event_type: 'runtime.manifest.published.v1', payload_json: { manifestVersion: result.version } });
  });

  it('protects published snapshots from update and delete', async () => {
    await expect(pool.query('UPDATE runtime_manifest_snapshots SET content_hash=$1 WHERE version=$2', ['0'.repeat(64), baseline])).rejects.toThrow();
    await expect(pool.query('DELETE FROM runtime_manifest_snapshots WHERE version=$1', [baseline])).rejects.toThrow();
  });
});

async function publish(expectedActiveVersion?: number, operationId = `t015-publish-${nanoid(8)}`) {
  return publishWith(undefined, undefined, undefined, expectedActiveVersion, operationId);
}

async function publishWith(cache: RuntimeManifestCache = { sync: async () => undefined }, telemetry: RuntimeManifestTelemetry = { cacheFailure: () => undefined }, reader: RuntimeManifestSourceReader = new RuntimeManifestSourcePostgresAdapter(pool), expectedActiveVersion?: number, operationId = `t015-publish-${nanoid(8)}`) {
  const useCase = new PublishRuntimeManifest(reader, privileged(), cache, telemetry);
  return useCase.execute({ identity: identity(), decision: allow(), operationId, correlationId: `corr-${operationId}`, expectedActiveVersion });
}

async function rollback(targetVersion: number, expectedActiveVersion: number) {
  const useCase = new RollbackRuntimeManifest(privileged(), { sync: async () => undefined }, { cacheFailure: () => undefined });
  return useCase.execute({ identity: identity(), decision: allow(), operationId: `t015-rollback-${nanoid(8)}`, correlationId: `corr-${nanoid(8)}`, targetVersion, expectedActiveVersion });
}

function privileged(): PrivilegedChangeService<RuntimeManifestChangeScope> {
  const uow = new PgPrivilegedChangeUnitOfWork(pool, (client, base) => ({ ...base, runtimeManifest: new RuntimeManifestPostgresStore(client) }));
  return new PrivilegedChangeService(uow, new SystemClock());
}

function identity() {
  return { userId: actor.userId, organizationId: actor.organizationId, membershipId: actor.membershipId, membershipStatus: 'ACTIVE' as const };
}

async function activeVersion(): Promise<number> {
  const result = await pool.query<{ active_version: string }>("SELECT active_version FROM runtime_manifest_state WHERE id='active'");
  return Number(result.rows[0].active_version);
}

async function latestVersion(): Promise<number> {
  const result = await pool.query<{ version: string }>('SELECT MAX(version)::text AS version FROM runtime_manifest_snapshots');
  return Number(result.rows[0].version);
}

async function snapshotExists(version: number): Promise<boolean> {
  const result = await pool.query('SELECT 1 FROM runtime_manifest_snapshots WHERE version=$1', [version]);
  return result.rowCount === 1;
}
