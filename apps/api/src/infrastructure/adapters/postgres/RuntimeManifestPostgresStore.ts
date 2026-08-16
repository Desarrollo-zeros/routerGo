import type pg from 'pg';
import { ManifestSchema } from '../../../config/runtime-manifest-schemas.js';
import { validateRuntimeManifest } from '../../../config/RuntimeManifestValidator.js';
import type {
  PublishedRuntimeManifest, RuntimeManifestStore,
} from '../../../application/ports/outbound/RuntimeManifestPorts.js';

export class RuntimeManifestPostgresStore implements RuntimeManifestStore {
  constructor(private readonly client: pg.PoolClient) {}

  async lockActiveVersion(): Promise<number | null> {
    await this.client.query("SELECT pg_advisory_xact_lock(hashtextextended('routergo:runtime-manifest', 0))");
    const result = await this.client.query<{ active_version: string }>(
      "SELECT active_version FROM runtime_manifest_state WHERE id='active' FOR UPDATE",
    );
    return result.rows[0] ? Number(result.rows[0].active_version) : null;
  }

  async latestVersion(): Promise<number> {
    const result = await this.client.query<{ version: string }>(
      'SELECT COALESCE(MAX(version), 0)::text AS version FROM runtime_manifest_snapshots',
    );
    return Number(result.rows[0]?.version ?? 0);
  }

  async read(version: number): Promise<PublishedRuntimeManifest | null> {
    const result = await this.client.query<{ version: string; content_hash: string; snapshot_json: unknown }>(
      'SELECT version, content_hash, snapshot_json FROM runtime_manifest_snapshots WHERE version=$1', [version],
    );
    const row = result.rows[0];
    if (!row) return null;
    const manifest = ManifestSchema.parse({ ...(row.snapshot_json as object), version: Number(row.version), contentHash: row.content_hash });
    validateRuntimeManifest(manifest);
    return { version: Number(row.version), contentHash: row.content_hash, manifest };
  }

  async append(snapshot: PublishedRuntimeManifest): Promise<void> {
    const result = await this.client.query(
      `INSERT INTO runtime_manifest_snapshots(version, schema_version, content_hash, snapshot_json)
       VALUES ($1, 'v1', $2, $3) ON CONFLICT (version) DO NOTHING`,
      [snapshot.version, snapshot.contentHash, snapshot.manifest],
    );
    if (result.rowCount !== 1) throw new Error(`PUBLISH_FAILED:version:${snapshot.version}`);
  }

  async activate(version: number): Promise<void> {
    await this.client.query(
      `INSERT INTO runtime_manifest_state(id, active_version) VALUES ('active', $1)
       ON CONFLICT (id) DO UPDATE SET active_version=EXCLUDED.active_version, updated_at=now()`,
      [version],
    );
  }
}
