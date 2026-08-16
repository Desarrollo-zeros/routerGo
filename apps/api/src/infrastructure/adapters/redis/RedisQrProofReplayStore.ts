import type Redis from 'ioredis';
import type { QrProofReplayStore } from '../../../application/ports/outbound/QrProof.js';

export class RedisQrProofReplayStore implements QrProofReplayStore {
  constructor(private readonly redis: Redis) {}

  async claim(nonce: string, expiresAt: Date): Promise<boolean> {
    const ttl = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
    if (!nonce || ttl <= 0) return false;
    const result = await this.redis.set(key(nonce), '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }
}

function key(nonce: string): string {
  return `treasure:qr:replay:${encodeURIComponent(nonce)}`;
}
