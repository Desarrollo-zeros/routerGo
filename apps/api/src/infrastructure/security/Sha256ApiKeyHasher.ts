import { createHash } from 'node:crypto';
import type { ApiKeyHasher } from '../../application/ports/outbound/ApiKeyHasher';

export class Sha256ApiKeyHasher implements ApiKeyHasher {
  hash(rawKey: string): string {
    return createHash('sha256').update(rawKey, 'utf8').digest('hex');
  }
}
