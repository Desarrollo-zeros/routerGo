import type pg from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { seedGateways } from './seed-gateways.js';
import { seedEndpoints } from './seed-endpoints.js';
import { seedModels } from './seed-models.js';
import { seedCredentials } from './seed-credentials.js';
import { seedRoutes } from './seed-routes.js';
import { seedPolicies } from './seed-policies.js';
import { seedDesignTokens } from './seed-design-tokens.js';
import { seedNavigation } from './seed-navigation.js';
import { seedFeatureFlags } from './seed-feature-flags.js';
import { seedIdentity } from './seed-identity.js';
import { seedUiRoutes } from './seed-ui-routes.js';
import { seedRuntimeManifest } from './seed-runtime-manifest.js';
import { seedLocalBudget } from './seed-local-budget.js';
import { seedTreasure } from './seed-treasure.js';
import { seedLearning } from './seed-learning.js';
import { seedAds } from './seed-ads.js';
import { seedCms } from './seed-cms.js';

export const SEED_VERSION = '2026-08-16-r16';
export const MANIFEST_VERSION = 12;

function checksumFor(version: string): string {
  return createHash('sha256').update(version).digest('hex').slice(0, 16);
}

async function insertSeedRun(
  client: pg.PoolClient,
  id: string,
  checksum: string,
): Promise<void> {
  await client.query(
    `INSERT INTO seed_runs(id, seed_version, checksum, manifest_version, actor, status)
     VALUES ($1,$2,$3,$4,'system','RUNNING')
     ON CONFLICT (id) DO UPDATE SET seed_version=EXCLUDED.seed_version, checksum=EXCLUDED.checksum, status='RUNNING'`,
    [id, SEED_VERSION, checksum, MANIFEST_VERSION],
  );
}

async function completeSeedRun(client: pg.PoolClient, id: string): Promise<void> {
  await client.query(`UPDATE seed_runs SET status='COMPLETED', completed_at=now() WHERE id=$1`, [id]);
}

export async function runSeed(pool: pg.Pool): Promise<{ status: string; seedVersion: string; checksum: string }> {
  const checksum = checksumFor(SEED_VERSION);
  const runId = `seed-${SEED_VERSION}`;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await insertSeedRun(client, runId, checksum);
    await seedGateways(client);
    await seedEndpoints(client);
    await seedModels(client);
    await seedCredentials(client);
    await seedRoutes(client);
    await seedPolicies(client);
    await seedDesignTokens(client);
    await seedUiRoutes(client);
    await seedNavigation(client);
    await seedFeatureFlags(client);
    await seedIdentity(client);
    await seedLocalBudget(client);
    await seedTreasure(client);
    await seedLearning(client);
    await seedAds(client);
    await seedCms(client);
    await seedRuntimeManifest(client, MANIFEST_VERSION);
    await completeSeedRun(client, runId);
    await client.query('COMMIT');
    return { status: 'COMPLETED', seedVersion: SEED_VERSION, checksum };
  } catch (err) {
    await client.query('ROLLBACK');
    const failId = randomUUID();
    await pool.query(
      `INSERT INTO seed_runs(id, seed_version, checksum, manifest_version, actor, status) VALUES ($1,$2,$3,$4,'system','FAILED') ON CONFLICT DO NOTHING`,
      [failId, SEED_VERSION, checksum, MANIFEST_VERSION],
    );
    throw err;
  } finally {
    client.release();
  }
}
