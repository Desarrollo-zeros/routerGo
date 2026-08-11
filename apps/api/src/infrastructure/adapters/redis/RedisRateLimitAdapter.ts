import type Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class RedisRateLimitAdapter {
  constructor(
    private readonly redis: Redis,
    private readonly windowMs: number = 60_000,
    private readonly max: number = 60,
  ) {}

  private key(scope: string): string {
    return `ratelimit:${scope}`;
  }

  async check(scope: string): Promise<RateLimitResult> {
    const k = this.key(scope);
    const count = await this.redis.incr(k);
    if (count === 1) await this.redis.pexpire(k, this.windowMs);
    const ttl = await this.redis.pttl(k);
    const allowed = count <= this.max;
    return { allowed, remaining: Math.max(0, this.max - count), retryAfterMs: allowed ? 0 : ttl > 0 ? ttl : this.windowMs };
  }

  async reset(scope: string): Promise<void> {
    await this.redis.del(this.key(scope));
  }
}

export class RedisCooldownAdapter {
  constructor(private readonly redis: Redis) {}

  private key(deploymentId: string): string {
    return `cooldown:${deploymentId}`;
  }

  async setCooldown(deploymentId: string, until: Date): Promise<void> {
    const ttl = until.getTime() - Date.now();
    if (ttl <= 0) return;
    await this.redis.set(this.key(deploymentId), until.toISOString(), 'PX', ttl);
  }

  async isCooldown(deploymentId: string): Promise<boolean> {
    const v = await this.redis.get(this.key(deploymentId));
    if (!v) return false;
    return new Date(v).getTime() > Date.now();
  }

  async clear(deploymentId: string): Promise<void> {
    await this.redis.del(this.key(deploymentId));
  }
}
