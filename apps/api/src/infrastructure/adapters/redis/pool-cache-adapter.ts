import type { Redis } from 'ioredis';

export class PoolCacheAdapter {
  constructor(private readonly redis: Redis, private readonly ttl = 60) {}

  async setEligible(ids: string[]): Promise<void> {
    await this.redis.set('pool:eligible_deployments', JSON.stringify(ids), 'EX', this.ttl);
  }

  async getEligible(): Promise<string[]> {
    const raw = await this.redis.get('pool:eligible_deployments');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  ttlSeconds(): number {
    return this.ttl;
  }
}
