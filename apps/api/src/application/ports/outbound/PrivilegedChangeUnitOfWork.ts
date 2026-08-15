import type { AuditLogAppender } from './AuditLogAppender';
import type { OutboxAppender } from './OutboxAppender';

export interface PrivilegedOperationIdempotency {
  isCompleted(operationId: string): Promise<boolean>;
}

export interface PrivilegedChangeScope {
  audit: AuditLogAppender;
  outbox: OutboxAppender;
  idempotency: PrivilegedOperationIdempotency;
}

export interface PrivilegedChangeUnitOfWork<TScope extends PrivilegedChangeScope = PrivilegedChangeScope> {
  run<TResult>(operationId: string, work: (scope: TScope) => Promise<TResult>): Promise<TResult>;
}
