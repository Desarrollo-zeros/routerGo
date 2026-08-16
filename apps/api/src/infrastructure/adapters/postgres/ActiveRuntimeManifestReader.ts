import type pg from 'pg';
import { ManifestSchema } from '../../../config/runtime-manifest-schemas.js';
import { validateRuntimeManifest } from '../../../config/RuntimeManifestValidator.js';
import type {
  PublishedRuntimeManifest, RuntimeManifestCache, RuntimeManifestCacheReader, RuntimeManifestTelemetry,
} from '../../../application/ports/outbound/RuntimeManifestPorts.js';

export class ActiveRuntimeManifestReader {
  constructor(
    private readonly pool: pg.Pool,
    private readonly cache: RuntimeManifestCache & RuntimeManifestCacheReader,
    private readonly telemetry: RuntimeManifestTelemetry,
  ) {}

  async read(): Promise<PublishedRuntimeManifest> {
    const version = await this.activeVersion();
    const cached = await this.readCache(version);
    if (cached) return cached;
    const snapshot = await this.readDatabase(version);
    await this.writeCache(snapshot);
    return snapshot;
  }

  private async activeVersion(): Promise<number> {
    const result = await this.pool.query<{ active_version: string }>("SELECT active_version FROM runtime_manifest_state WHERE id='active'");
    const version = result.rows[0]?.active_version;
    if (!version) throw new Error('NO_ACTIVE_MANIFEST');
    return Number(version);
  }

  private async readCache(version: number): Promise<PublishedRuntimeManifest | null> {
    try {
      return await this.cache.read(version);
    } catch (error) {
      this.telemetry.cacheFailure(error);
      return null;
    }
  }

  private async readDatabase(version: number): Promise<PublishedRuntimeManifest> {
    const result = await this.pool.query<{ content_hash: string; snapshot_json: unknown }>(
      'SELECT content_hash, snapshot_json FROM runtime_manifest_snapshots WHERE version=$1', [version],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`VERSION_NOT_FOUND:${version}`);
    const manifest = ManifestSchema.parse({ ...(row.snapshot_json as object), version, contentHash: row.content_hash });
    validateRuntimeManifest(manifest);
    return { version, contentHash: row.content_hash, manifest };
  }

  private async writeCache(snapshot: PublishedRuntimeManifest): Promise<void> {
    try {
      await this.cache.sync(snapshot);
    } catch (error) {
      this.telemetry.cacheFailure(error);
    }
  }
}
