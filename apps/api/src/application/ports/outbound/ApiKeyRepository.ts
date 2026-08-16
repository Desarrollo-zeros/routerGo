export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface ApiKeyRecord {
  id: string;
  clientId: string;
  keyHash: string;
  prefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
}

export interface ApiKeyRepository {
  insert(record: ApiKeyRecord): Promise<void>;
  findByHash(keyHash: string): Promise<ApiKeyRecord | null>;
  findById(id: string): Promise<ApiKeyRecord | null>;
  revoke(id: string, revokedAt: Date): Promise<void>;
  touchLastUsed(id: string, usedAt: Date): Promise<void>;
}
