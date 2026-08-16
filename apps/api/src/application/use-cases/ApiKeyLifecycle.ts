import { randomBytes } from 'node:crypto';
import { nanoid } from 'nanoid';
import type { Clock } from '../ports/outbound/Clock';
import type { ApiKeyHasher } from '../ports/outbound/ApiKeyHasher';
import type { ApiKeyRecord, ApiKeyRepository } from '../ports/outbound/ApiKeyRepository';
import type {
  ApiKeyLifecyclePort,
  ApiKeyPrincipal,
  IssueApiKeyInput,
  IssueApiKeyOutput,
} from '../ports/inbound/ApiKeyLifecyclePort';

export const API_SCOPES = ['models.read', 'chat.completions', 'economy.read', 'audit.read', 'providers.read', 'runtime.publish', 'runtime.rollback', 'campaigns.read', 'campaigns.manage'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export interface ApiKeyLifecycleDependencies {
  repository: ApiKeyRepository;
  hasher: ApiKeyHasher;
  clock: Clock;
  idGenerator?: () => string;
  secretGenerator?: () => string;
}

export class ApiKeyLifecycleUseCase implements ApiKeyLifecyclePort {
  private readonly idGenerator: () => string;
  private readonly secretGenerator: () => string;

  constructor(private readonly dependencies: ApiKeyLifecycleDependencies) {
    this.idGenerator = dependencies.idGenerator ?? nanoid;
    this.secretGenerator = dependencies.secretGenerator ?? createRawKey;
  }

  async issue(input: IssueApiKeyInput): Promise<IssueApiKeyOutput> {
    validateIssue(input, this.dependencies.clock.now());
    const rawKey = this.secretGenerator();
    const record: ApiKeyRecord = {
      id: this.idGenerator(),
      clientId: input.clientId,
      keyHash: this.dependencies.hasher.hash(rawKey),
      prefix: rawKey.slice(0, 12),
      scopes: [...input.scopes],
      status: 'ACTIVE',
      expiresAt: input.expiresAt ?? null,
    };
    await this.dependencies.repository.insert(record);
    return { keyId: record.id, rawKey, prefix: record.prefix, scopes: record.scopes, expiresAt: record.expiresAt };
  }

  async revoke(keyId: string): Promise<void> {
    const record = await this.requireKey(keyId);
    if (record.status === 'REVOKED') throw new ApiKeyLifecycleError('KEY_ALREADY_REVOKED');
    await this.dependencies.repository.revoke(keyId, this.dependencies.clock.now());
  }

  async rotate(keyId: string): Promise<IssueApiKeyOutput> {
    const record = await this.requireKey(keyId);
    await this.revoke(keyId);
    return this.issue({ clientId: record.clientId, scopes: record.scopes, expiresAt: record.expiresAt });
  }

  async authenticate(rawKey: string, requiredScope?: string): Promise<ApiKeyPrincipal> {
    if (!rawKey) throw new ApiKeyLifecycleError('INVALID_INPUT');
    const record = await this.dependencies.repository.findByHash(this.dependencies.hasher.hash(rawKey));
    if (!record) throw new ApiKeyLifecycleError('KEY_NOT_FOUND');
    assertUsable(record, requiredScope, this.dependencies.clock.now());
    await this.dependencies.repository.touchLastUsed(record.id, this.dependencies.clock.now());
    return { keyId: record.id, clientId: record.clientId, scopes: [...record.scopes] };
  }

  private async requireKey(keyId: string): Promise<ApiKeyRecord> {
    const record = await this.dependencies.repository.findById(keyId);
    if (!record) throw new ApiKeyLifecycleError('KEY_NOT_FOUND');
    return record;
  }
}

export type ApiKeyErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_SCOPE'
  | 'KEY_NOT_FOUND'
  | 'KEY_REVOKED'
  | 'KEY_EXPIRED'
  | 'SCOPE_DENIED'
  | 'KEY_ALREADY_REVOKED';

export class ApiKeyLifecycleError extends Error {
  constructor(readonly code: ApiKeyErrorCode) {
    super(code);
    this.name = 'ApiKeyLifecycleError';
  }
}

function validateIssue(input: IssueApiKeyInput, now: Date): void {
  if (!input.clientId || input.scopes.length === 0 || input.scopes.some((scope) => !isApiScope(scope))) {
    throw new ApiKeyLifecycleError(input.scopes.some((scope) => !isApiScope(scope)) ? 'INVALID_SCOPE' : 'INVALID_INPUT');
  }
  if (input.expiresAt && input.expiresAt <= now) throw new ApiKeyLifecycleError('INVALID_INPUT');
}

function assertUsable(record: ApiKeyRecord, requiredScope: string | undefined, now: Date): void {
  if (record.status === 'REVOKED') throw new ApiKeyLifecycleError('KEY_REVOKED');
  if (record.status === 'EXPIRED' || (record.expiresAt !== null && record.expiresAt <= now)) throw new ApiKeyLifecycleError('KEY_EXPIRED');
  if (requiredScope && !record.scopes.includes(requiredScope)) throw new ApiKeyLifecycleError('SCOPE_DENIED');
}

function isApiScope(scope: string): scope is ApiScope {
  return (API_SCOPES as readonly string[]).includes(scope);
}

function createRawKey(): string {
  return `rg_live_${randomBytes(24).toString('base64url')}`;
}
