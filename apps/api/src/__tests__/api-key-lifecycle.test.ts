import { describe, expect, it } from 'vitest';
import { FixedClock } from '../application/ports/outbound/Clock';
import type { ApiKeyRecord, ApiKeyRepository } from '../application/ports/outbound/ApiKeyRepository';
import { ApiKeyLifecycleError, ApiKeyLifecycleUseCase } from '../application/use-cases/ApiKeyLifecycle';

class FakeKeys implements ApiKeyRepository {
  readonly records = new Map<string, ApiKeyRecord>();
  async insert(record: ApiKeyRecord): Promise<void> { this.records.set(record.id, record); }
  async findByHash(hash: string): Promise<ApiKeyRecord | null> { return [...this.records.values()].find((record) => record.keyHash === hash) ?? null; }
  async findById(id: string): Promise<ApiKeyRecord | null> { return this.records.get(id) ?? null; }
  async revoke(id: string): Promise<void> { const record = this.records.get(id); if (record) this.records.set(id, { ...record, status: 'REVOKED' }); }
  async touchLastUsed(): Promise<void> {}
}

const hasher = { hash: (value: string) => `digest-${value.length}` };
const clock = new FixedClock(new Date('2030-01-01T00:00:00Z'));

function create() {
  const repository = new FakeKeys();
  let sequence = 0;
  const useCase = new ApiKeyLifecycleUseCase({ repository, hasher, clock, idGenerator: () => `key-${++sequence}`, secretGenerator: () => 'rg_live_secret' });
  return { repository, useCase };
}

describe('API key lifecycle', () => {
  it('returns the raw key once and stores only its hash', async () => {
    const { repository, useCase } = create();
    const issued = await useCase.issue({ clientId: 'client-1', scopes: ['models.read'] });
    expect(issued.rawKey).toBe('rg_live_secret');
    expect(repository.records.get('key-1')?.keyHash).toBe('digest-14');
    expect(repository.records.get('key-1')?.keyHash).not.toContain(issued.rawKey);
  });

  it('authenticates by hash and enforces scopes and revocation', async () => {
    const { useCase } = create();
    await useCase.issue({ clientId: 'client-1', scopes: ['models.read'] });
    await expect(useCase.authenticate('rg_live_secret', 'models.read')).resolves.toMatchObject({ clientId: 'client-1' });
    await expect(useCase.authenticate('rg_live_secret', 'chat.completions')).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    await useCase.revoke('key-1');
    await expect(useCase.authenticate('rg_live_secret')).rejects.toMatchObject({ code: 'KEY_REVOKED' });
  });

  it('rejects invalid scopes and expired keys', async () => {
    const { useCase } = create();
    await expect(useCase.issue({ clientId: 'client-1', scopes: ['admin'] })).rejects.toMatchObject({ code: 'INVALID_SCOPE' });
    await expect(useCase.issue({ clientId: 'client-1', scopes: ['models.read'], expiresAt: new Date('2029-01-01') })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(useCase.authenticate('missing')).rejects.toBeInstanceOf(ApiKeyLifecycleError);
  });

  it('rotates by revoking the old key and issuing a new key', async () => {
    const { repository, useCase } = create();
    await useCase.issue({ clientId: 'client-1', scopes: ['models.read'] });
    const rotated = await useCase.rotate('key-1');
    expect(rotated.keyId).toBe('key-2');
    expect(repository.records.get('key-1')?.status).toBe('REVOKED');
    expect(repository.records.get('key-2')?.status).toBe('ACTIVE');
  });
});
