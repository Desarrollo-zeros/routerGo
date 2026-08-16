import type pg from 'pg';
import { buildRuntimeManifest } from '../../config/RuntimeManifestBuilder.js';
import { RuntimeManifestSourcePostgresAdapter } from '../../infrastructure/adapters/postgres/RuntimeManifestSourcePostgresAdapter.js';

export async function seedRuntimeManifest(client: pg.PoolClient, version: number): Promise<void> {
  const source = await new RuntimeManifestSourcePostgresAdapter(client).read();
  const manifest = buildRuntimeManifest(version, source);
  const existing = await client.query<{ content_hash: string }>(
    'SELECT content_hash FROM runtime_manifest_snapshots WHERE version=$1', [version],
  );
  const resolvedVersion = await resolveVersion(client, version, manifest.contentHash, existing.rows[0]?.content_hash);
  const resolved = await client.query('SELECT 1 FROM runtime_manifest_snapshots WHERE version=$1', [resolvedVersion]);
  if (resolved.rowCount === 0) {
    const resolvedManifest = resolvedVersion === version ? manifest : buildRuntimeManifest(resolvedVersion, source);
    await client.query(
      `INSERT INTO runtime_manifest_snapshots(version, schema_version, content_hash, snapshot_json)
       VALUES ($1,'v1',$2,$3)`,
      [resolvedVersion, resolvedManifest.contentHash, resolvedManifest],
    );
  }
  await client.query(
    `INSERT INTO runtime_manifest_state(id, active_version) VALUES ('active',$1)
     ON CONFLICT (id) DO NOTHING`, [resolvedVersion],
  );
}

async function resolveVersion(client: pg.PoolClient, requested: number, hash: string, requestedHash?: string): Promise<number> {
  if (!requestedHash || requestedHash === hash) return requested;
  const same = await client.query<{ version: string }>('SELECT version FROM runtime_manifest_snapshots WHERE content_hash=$1 ORDER BY version DESC LIMIT 1', [hash]);
  if (same.rows[0]) return Number(same.rows[0].version);
  const latest = await client.query<{ version: string }>('SELECT COALESCE(MAX(version),0)::text AS version FROM runtime_manifest_snapshots');
  return Number(latest.rows[0]?.version ?? 0) + 1;
}
