import type Redis from 'ioredis';
import type { ApiQuotaCounter, ApiQuotaDecision, ApiQuotaUsage } from '../../../application/ports/outbound/ApiQuotaCounter';
import type { ApiQuotaPolicy } from '../../../application/ports/outbound/ApiQuotaRepository';

const WINDOW_MS = 60_000;
const DIMENSIONS = ['requests', 'tokens', 'credits'] as const;
const SCRIPT = `
for i=1,#KEYS do
  local current=tonumber(redis.call('GET',KEYS[i]) or '0')
  local limit=tonumber(ARGV[(i-1)*3+1])
  local increment=tonumber(ARGV[(i-1)*3+2])
  if limit > 0 and current + increment > limit then return {0,i} end
end
for i=1,#KEYS do
  local increment=tonumber(ARGV[(i-1)*3+2])
  if increment > 0 then redis.call('INCRBY',KEYS[i],increment); redis.call('PEXPIRE',KEYS[i],ARGV[(i-1)*3+3]) end
end
return {1,0}
`;

export class RedisApiQuotaCounter implements ApiQuotaCounter {
  constructor(private readonly redis: Redis) {}

  async consume(policies: ApiQuotaPolicy[], usage: ApiQuotaUsage): Promise<ApiQuotaDecision> {
    if (policies.length === 0) return { allowed: true, reason: 'ALLOWED', retryAfterMs: 0 };
    const keys: string[] = [];
    const args: string[] = [];
    for (const policy of policies) this.appendPolicy(policy, usage, keys, args);
    const result = (await this.redis.eval(SCRIPT, keys.length, ...keys, ...args)) as [number, number];
    if (result[0] === 1) return { allowed: true, reason: 'ALLOWED', retryAfterMs: 0 };
    return { allowed: false, reason: this.reasonForKey(keys[result[1] - 1] ?? ''), retryAfterMs: WINDOW_MS };
  }

  private appendPolicy(policy: ApiQuotaPolicy, usage: ApiQuotaUsage, keys: string[], args: string[]): void {
    const limits = [policy.requestsPerMinute, policy.tokensPerMinute, policy.creditsPerMinute];
    const increments = [usage.requests, usage.tokens, usage.credits];
    for (let index = 0; index < DIMENSIONS.length; index += 1) {
      keys.push(`api-quota:${policy.scopeType}:${policy.scopeId}:${policy.modelPattern ?? '*'}:${DIMENSIONS[index]}`);
      args.push(String(limits[index] ?? 0), String(increments[index]), String(WINDOW_MS));
    }
  }

  private reasonForKey(key: string): ApiQuotaDecision['reason'] {
    if (key.endsWith(':tokens')) return 'TOKENS_EXCEEDED';
    if (key.endsWith(':credits')) return 'CREDITS_EXCEEDED';
    return 'REQUESTS_EXCEEDED';
  }
}
