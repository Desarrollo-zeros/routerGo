import type { PrivilegedChangeCommand } from '../contracts/PrivilegedChange';
import type { JsonObject } from '../contracts/JsonValue';
import { PrivilegedChangeError } from '../errors/PrivilegedChangeError';
import type { Clock } from '../ports/outbound/Clock';
import type { PrivilegedChangeScope, PrivilegedChangeUnitOfWork } from '../ports/outbound/PrivilegedChangeUnitOfWork';
import { sanitizeAuditMetadata } from './AuditMetadataSanitizer';

export class PrivilegedChangeService<TScope extends PrivilegedChangeScope = PrivilegedChangeScope> {
  constructor(
    private readonly unitOfWork: PrivilegedChangeUnitOfWork<TScope>,
    private readonly clock: Clock,
  ) {}

  async execute<TResult>(command: PrivilegedChangeCommand<TResult, TScope>): Promise<TResult> {
    validateCommand(command);
    if (!command.decision.allowed) {
      throw new PrivilegedChangeError('UNAUTHORIZED', 'Privileged change denied', command.decision.reason);
    }
    const occurredAt = this.clock.now();
    return this.unitOfWork.run(command.operationId, async (scope) => {
      if (await scope.idempotency.isCompleted(command.operationId)) throw duplicateOperation();
      const result = await command.mutate(scope);
      const metadata = sanitizeAuditMetadata({ ...command.metadata, authorizationReason: command.decision.reason });
      await appendAudit(scope, command, metadata, occurredAt);
      await appendOutbox(scope, command, metadata, occurredAt);
      return result;
    });
  }
}

async function appendAudit<TScope extends PrivilegedChangeScope, TResult>(
  scope: TScope,
  command: PrivilegedChangeCommand<TResult, TScope>,
  metadata: JsonObject,
  createdAt: Date,
): Promise<void> {
  try {
    const result = await scope.audit.append({
      id: command.operationId,
      actorUserId: command.identity.userId,
      actorOrganizationId: command.identity.organizationId,
      action: command.action,
      resourceType: command.resource.type,
      resourceId: command.resource.id,
      metadata,
      correlationId: command.correlationId,
      createdAt,
    });
    if (result === 'DUPLICATE') throw duplicateOperation();
  } catch (error) {
    if (error instanceof PrivilegedChangeError) throw error;
    throw new PrivilegedChangeError('AUDIT_PERSISTENCE_FAILED', 'Audit append failed', undefined, error);
  }
}

async function appendOutbox<TScope extends PrivilegedChangeScope, TResult>(
  scope: TScope,
  command: PrivilegedChangeCommand<TResult, TScope>,
  metadata: JsonObject,
  occurredAt: Date,
): Promise<void> {
  try {
    const result = await scope.outbox.append({
      id: `outbox:${command.operationId}`,
      eventType: command.event.eventType,
      aggregateType: command.event.aggregateType,
      aggregateId: command.event.aggregateId,
      payload: sanitizeAuditMetadata({ ...command.event.payload, metadata, correlationId: command.correlationId }),
      occurredAt,
    });
    if (result === 'DUPLICATE') throw duplicateOperation();
  } catch (error) {
    if (error instanceof PrivilegedChangeError) throw error;
    throw new PrivilegedChangeError('OUTBOX_PERSISTENCE_FAILED', 'Outbox append failed', undefined, error);
  }
}

function validateCommand<TResult, TScope extends PrivilegedChangeScope>(command: PrivilegedChangeCommand<TResult, TScope>): void {
  const required = [command.operationId, command.correlationId, command.action, command.resource.type, command.resource.id, command.event.eventType, command.event.aggregateType, command.event.aggregateId];
  if (required.some((value) => !value.trim()) || !isActionKey(command.action) || !isVersionedEvent(command.event.eventType)) {
    throw new PrivilegedChangeError('INVALID_PRIVILEGED_CHANGE', 'Invalid privileged change contract');
  }
}

function isActionKey(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/.test(value);
}

function isVersionedEvent(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*\.v[0-9]+$/.test(value);
}

function duplicateOperation(): PrivilegedChangeError {
  return new PrivilegedChangeError('DUPLICATE_OPERATION', 'Privileged operation already completed');
}
