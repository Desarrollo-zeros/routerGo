import type pg from 'pg';
import { buildRuntimeManifest } from '../../config/RuntimeManifestBuilder.js';
import { RuntimeManifestSourcePostgresAdapter } from '../../infrastructure/adapters/postgres/RuntimeManifestSourcePostgresAdapter.js';

export async function seedRuntimeManifest(client: pg.PoolClient, version: number): Promise<void> {
  const source = await new RuntimeManifestSourcePostgresAdapter(client).read();
  const manifest = buildRuntimeManifest(version, source);
  const existing = await client.query<{ content_hash: string }>(
    'SELECT content_hash FROM runtime_manifest_snapshots WHERE version=$1', [version],
  );
  if (existing.rows[0] && existing.rows[0].content_hash !== manifest.contentHash) {
    throw new Error(`immutable runtime manifest version ${version} differs from seed candidate`);
  }
  if (!existing.rows[0]) {
    await client.query(
      `INSERT INTO runtime_manifest_snapshots(version, schema_version, content_hash, snapshot_json)
       VALUES ($1,'v1',$2,$3)`,
      [version, manifest.contentHash, manifest],
    );
  }
  await client.query(
    `INSERT INTO runtime_manifest_state(id, active_version) VALUES ('active',$1)
     ON CONFLICT (id) DO NOTHING`, [version],
  );
}
