import type Redis from 'ioredis';

export class RedisManifestCacheAdapter {
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
}
