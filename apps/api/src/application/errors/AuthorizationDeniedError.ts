import type { AccessDecisionReason } from '../../domain/authorization/AccessDecision.js';

export class AuthorizationDeniedError extends Error {
  constructor(public readonly reason: AccessDecisionReason) {
    super(`Authorization denied: ${reason}`);
    this.name = 'AuthorizationDeniedError';
  }
}
