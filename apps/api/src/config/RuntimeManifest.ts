import type pg from 'pg';
import { ManifestSchema, type RuntimeManifest } from './runtime-manifest-schemas.js';
import { validateRuntimeManifest } from './RuntimeManifestValidator.js';

export * from './runtime-manifest-schemas.js';

export async function loadRuntimeManifest(pool: pg.Pool): Promise<RuntimeManifest> {
  const state = await pool.query<{ active_version: string }>(
    "SELECT active_version FROM runtime_manifest_state WHERE id='active'",
  );
  const activeVersion = state.rows[0]?.active_version;
  if (!activeVersion) throw new Error('NO_ACTIVE_MANIFEST');
  const result = await pool.query<{ version: string; content_hash: string; snapshot_json: unknown }>(
    'SELECT version, content_hash, snapshot_json FROM runtime_manifest_snapshots WHERE version=$1',
    [activeVersion],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`VERSION_NOT_FOUND:${activeVersion}`);
  const payload = typeof row.snapshot_json === 'object' && row.snapshot_json !== null
    ? row.snapshot_json
    : {};
  const manifest = ManifestSchema.parse({ ...payload, version: Number(row.version), contentHash: row.content_hash });
  validateRuntimeManifest(manifest);
  return manifest;
}
