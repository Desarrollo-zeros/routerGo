import type pg from 'pg';
import type Redis from 'ioredis';
import { PublishRuntimeManifest } from '../application/use-cases/PublishRuntimeManifest.js';
import { RollbackRuntimeManifest } from '../application/use-cases/RollbackRuntimeManifest.js';
import { PrivilegedChangeService } from '../application/services/PrivilegedChangeService.js';
import { SystemClock } from '../application/ports/outbound/Clock.js';
import type { RuntimeManifestChangeScope } from '../application/ports/outbound/RuntimeManifestPorts.js';
import { PgPrivilegedChangeUnitOfWork } from '../infrastructure/adapters/postgres/PgPrivilegedChangeUnitOfWork.js';
import { RuntimeManifestPostgresStore } from '../infrastructure/adapters/postgres/RuntimeManifestPostgresStore.js';
import { RuntimeManifestSourcePostgresAdapter } from '../infrastructure/adapters/postgres/RuntimeManifestSourcePostgresAdapter.js';
import { RedisManifestCacheAdapter } from '../infrastructure/adapters/redis/RedisManifestCacheAdapter.js';

export function createRuntimeManifestUseCases(pool: pg.Pool, redis: Redis) {
  const cache = new RedisManifestCacheAdapter(redis);
  const telemetry = { cacheFailure: (_error: unknown) => undefined };
  const privileged = new PrivilegedChangeService(
    new PgPrivilegedChangeUnitOfWork<RuntimeManifestChangeScope>(pool, (client, base) => ({ ...base, runtimeManifest: new RuntimeManifestPostgresStore(client) })),
    new SystemClock(),
  );
  const source = new RuntimeManifestSourcePostgresAdapter(pool);
  return {
    publish: new PublishRuntimeManifest(source, privileged, cache, telemetry),
    rollback: new RollbackRuntimeManifest(privileged, cache, telemetry),
  };
}
