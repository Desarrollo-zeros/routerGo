import type Redis from 'ioredis';
import { ManifestSchema } from '../../../config/runtime-manifest-schemas';
import { validateRuntimeManifest } from '../../../config/RuntimeManifestValidator';
import type { PublishedRuntimeManifest, RuntimeManifestCache, RuntimeManifestCacheReader } from '../../../application/ports/outbound/RuntimeManifestPorts';

export class RedisManifestCacheAdapter implements RuntimeManifestCache, RuntimeManifestCacheReader {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 300,
  ) {}

  private key(version: string): string {
    return `manifest:${version}`;
  }

  async get(version: string): Promise<string | null> {
    return this.redis.get(this.key(version));
  }

  async set(version: string, manifest: string): Promise<void> {
    await this.redis.set(this.key(version), manifest, 'EX', this.ttlSeconds);
  }

  async invalidate(version: string): Promise<void> {
    await this.redis.del(this.key(version));
  }

  async getCurrentVersion(): Promise<string | null> {
    return this.redis.get('manifest:current');
  }

  async setCurrentVersion(version: string): Promise<void> {
    await this.redis.set('manifest:current', version);
  }

  async sync(snapshot: PublishedRuntimeManifest): Promise<void> {
    await this.set(String(snapshot.version), JSON.stringify(snapshot.manifest));
    await this.setCurrentVersion(String(snapshot.version));
  }

  async read(version: number): Promise<PublishedRuntimeManifest | null> {
    const raw = await this.get(String(version));
    if (!raw) return null;
    const manifest = ManifestSchema.parse(JSON.parse(raw));
    validateRuntimeManifest(manifest);
    return { version, contentHash: manifest.contentHash ?? '', manifest };
  }
}
