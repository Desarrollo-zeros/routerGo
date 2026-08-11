import type Redis from 'ioredis';

export interface StreamEntry {
  id: string;
  event: string;
  data: string;
}

export class RedisStreamAdapter {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 3600,
  ) {}

  private key(runId: string): string {
    return `chat:${runId}:events`;
  }

  async append(runId: string, event: string, data: string): Promise<string> {
    const id = (await this.redis.xadd(this.key(runId), '*', 'event', event, 'data', data)) as string;
    await this.redis.expire(this.key(runId), this.ttlSeconds);
    return id ?? '';
  }

  async readFrom(runId: string, lastId: string, count = 100): Promise<StreamEntry[]> {
    const res = await this.redis.xread('COUNT', count, 'STREAMS', this.key(runId), lastId);
    if (!res) return [];
    const entries = res[0]?.[1] as [string, string[]][] | undefined;
    if (!entries) return [];
    return entries.map(([id, fields]) => {
      const map = new Map<string, string>();
      for (let i = 0; i < fields.length; i += 2) map.set(fields[i], fields[i + 1]);
      return { id, event: map.get('event') ?? '', data: map.get('data') ?? '' };
    });
  }

  async readAll(runId: string): Promise<StreamEntry[]> {
    return this.readFrom(runId, '0-0', 1000);
  }

  async trim(runId: string, maxLen = 1000): Promise<void> {
    await this.redis.xtrim(this.key(runId), 'MAXLEN', maxLen);
  }
}
