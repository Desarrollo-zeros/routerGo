import type { AccessDecision } from '../../domain/authorization/AccessDecision';
import type { IdentityContext } from './IdentityContext';
import type { JsonObject } from './JsonValue';
import type { PrivilegedChangeScope } from '../ports/outbound/PrivilegedChangeUnitOfWork';

export interface PrivilegedResource {
  type: string;
  id: string;
}

export interface PrivilegedEventInput {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: JsonObject;
}

export interface PrivilegedChangeCommand<
  TResult,
  TScope extends PrivilegedChangeScope = PrivilegedChangeScope,
> {
  identity: IdentityContext;
  decision: AccessDecision;
  operationId: string;
  correlationId: string;
  action: string;
  resource: PrivilegedResource;
  metadata: JsonObject;
  event: PrivilegedEventInput;
  mutate: (scope: TScope) => Promise<TResult>;
}
