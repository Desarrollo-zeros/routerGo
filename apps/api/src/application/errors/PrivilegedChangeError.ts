import type { AccessDecisionReason } from '../../domain/authorization/AccessDecision';

export type PrivilegedChangeErrorCode =
  | 'UNAUTHORIZED'
  | 'DUPLICATE_OPERATION'
  | 'INVALID_PRIVILEGED_CHANGE'
  | 'AUDIT_PERSISTENCE_FAILED'
  | 'OUTBOX_PERSISTENCE_FAILED';

export class PrivilegedChangeError extends Error {
  constructor(
    public readonly code: PrivilegedChangeErrorCode,
    message: string,
    public readonly reason?: AccessDecisionReason,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PrivilegedChangeError';
  }
}
