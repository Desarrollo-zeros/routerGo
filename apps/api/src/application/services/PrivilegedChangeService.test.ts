import { describe, expect, it } from 'vitest';
import type { IdentityContext } from '../contracts/IdentityContext';
import type { PrivilegedChangeCommand } from '../contracts/PrivilegedChange';
import type { AuditLogEntry } from '../ports/outbound/AuditLogAppender';
import type { OutboxEvent } from '../ports/outbound/OutboxAppender';
import type { PrivilegedChangeScope, PrivilegedChangeUnitOfWork } from '../ports/outbound/PrivilegedChangeUnitOfWork';
import { FixedClock } from '../ports/outbound/Clock';
import { PrivilegedChangeError } from '../errors/PrivilegedChangeError';
import { PrivilegedChangeService } from './PrivilegedChangeService';

type TestCommand = PrivilegedChangeCommand<string>;
const identity: IdentityContext = { userId: 'user-1', organizationId: 'org-a', membershipId: 'member-a', membershipStatus: 'ACTIVE' };
const now = new Date('2026-08-15T22:00:00.000Z');

class FakeScope implements PrivilegedChangeScope {
  readonly audits: AuditLogEntry[] = [];
  readonly events: OutboxEvent[] = [];
  readonly completed = new Set<string>();
  audit = { append: async (entry: AuditLogEntry) => { if (this.auditFailure) throw new Error('audit down'); this.audits.push(entry); this.completed.add(entry.id); return 'APPENDED' as const; } };
  outbox = { append: async (event: OutboxEvent) => { if (this.outboxFailure) throw new Error('outbox down'); this.events.push(event); return 'APPENDED' as const; } };
  idempotency = { isCompleted: async (operationId: string) => this.completed.has(operationId) };
  auditFailure = false;
  outboxFailure = false;
}

class FakeUnitOfWork implements PrivilegedChangeUnitOfWork {
  runs = 0;
  commits = 0;
  rollbacks = 0;
  constructor(readonly scope = new FakeScope()) {}

  async run<TResult>(_operationId: string, work: (scope: PrivilegedChangeScope) => Promise<TResult>): Promise<TResult> {
    this.runs += 1;
    try {
      const result = await work(this.scope);
      this.commits += 1;
      return result;
    } catch (error) {
      this.rollbacks += 1;
      throw error;
    }
  }
}

function fixture(): { service: PrivilegedChangeService; uow: FakeUnitOfWork } {
  const uow = new FakeUnitOfWork();
  return { service: new PrivilegedChangeService(uow, new FixedClock(now)), uow };
}

function command(overrides: Partial<TestCommand> = {}): TestCommand {
  return {
    identity,
    decision: { allowed: true, reason: 'ALLOWED' },
    operationId: 'operation-1',
    correlationId: 'correlation-1',
    action: 'runtime.publish',
    resource: { type: 'runtime_config', id: 'runtime-1' },
    metadata: { source: 'test', nested: { safe: true } },
    event: { eventType: 'runtime.config.published.v1', aggregateType: 'runtime_config', aggregateId: 'runtime-1', payload: { enabled: true } },
    mutate: async () => 'changed',
    ...overrides,
  };
}

describe('PrivilegedChangeService', () => {
  it('executes allowed mutation and appends audit plus outbox atomically', async () => {
    const { service, uow } = fixture();
    await expect(service.execute(command())).resolves.toBe('changed');
    expect(uow.scope.audits[0]).toMatchObject({ actorUserId: 'user-1', action: 'runtime.publish', resourceType: 'runtime_config', resourceId: 'runtime-1' });
    expect(uow.scope.events[0]).toMatchObject({ id: 'outbox:operation-1', eventType: 'runtime.config.published.v1', aggregateId: 'runtime-1' });
    expect(uow.scope.audits[0]?.correlationId).toBe(uow.scope.events[0]?.payload.correlationId);
    expect(uow.commits).toBe(1);
  });

  it('denies before starting a transaction or mutation', async () => {
    const { service, uow } = fixture();
    let mutated = false;
    await expect(service.execute(command({ decision: { allowed: false, reason: 'MISSING_PERMISSION' }, mutate: async () => { mutated = true; return 'bad'; } })))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED', reason: 'MISSING_PERMISSION' });
    expect(mutated).toBe(false);
    expect(uow.runs).toBe(0);
  });

  it('sanitizes sensitive metadata recursively and records the decision reason', async () => {
    const { service, uow } = fixture();
    await service.execute(command({ metadata: { password: 'x', nested: { api_key: 'y', safe: 'ok' }, list: [{ token: 'z', keep: true }] } }));
    expect(uow.scope.audits[0]?.metadata).toEqual({ nested: { safe: 'ok' }, list: [{ keep: true }], authorizationReason: 'ALLOWED' });
  });

  it('rejects a completed operation without running its mutation twice', async () => {
    const { service, uow } = fixture();
    uow.scope.completed.add('operation-1');
    let calls = 0;
    await expect(service.execute(command({ mutate: async () => { calls += 1; return 'duplicate'; } })))
      .rejects.toMatchObject({ code: 'DUPLICATE_OPERATION' });
    expect(calls).toBe(0);
    expect(uow.rollbacks).toBe(1);
  });

  it('rolls back when mutation fails before append', async () => {
    const { service, uow } = fixture();
    const failure = new Error('mutation failed');
    await expect(service.execute(command({ mutate: async () => { throw failure; } }))).rejects.toBe(failure);
    expect(uow.scope.audits).toHaveLength(0);
    expect(uow.scope.events).toHaveLength(0);
    expect(uow.rollbacks).toBe(1);
  });

  it('fails and rolls back when audit persistence fails', async () => {
    const { service, uow } = fixture();
    uow.scope.auditFailure = true;
    await expect(service.execute(command())).rejects.toMatchObject({ code: 'AUDIT_PERSISTENCE_FAILED' });
    expect(uow.scope.events).toHaveLength(0);
    expect(uow.rollbacks).toBe(1);
  });

  it('fails and rolls back when outbox persistence fails', async () => {
    const { service, uow } = fixture();
    uow.scope.outboxFailure = true;
    await expect(service.execute(command())).rejects.toMatchObject({ code: 'OUTBOX_PERSISTENCE_FAILED' });
    expect(uow.scope.audits).toHaveLength(1);
    expect(uow.rollbacks).toBe(1);
  });
});
