import type { AccessDecision } from '../../domain/authorization/AccessDecision';
import type { AuthorizationContext } from '../../domain/authorization/AuthorizationContext';
import type {
  AuthorizationSubject,
  AuthorizationSubjectIdentity,
} from '../../domain/authorization/AuthorizationSubject';
import type { IdentityContext } from '../contracts/IdentityContext';
import { AuthorizationPolicy } from '../../domain/authorization/AuthorizationPolicy';
import type { AuthorizationGrantReader } from '../ports/outbound/AuthorizationGrantReader';

export interface AuthorizePermissionInput {
  identity: IdentityContext;
  permission: string;
  context?: AuthorizationContext;
}

export function toAuthorizationSubjectIdentity(identity: IdentityContext): AuthorizationSubjectIdentity {
  return {
    userId: identity.userId,
    membershipId: identity.membershipId,
    organizationId: identity.organizationId,
    membershipStatus: identity.membershipStatus,
  };
}

export class AuthorizePermissionUseCase {
  constructor(
    private readonly grants: AuthorizationGrantReader,
    private readonly policy: AuthorizationPolicy = new AuthorizationPolicy(),
  ) {}

  async execute(input: AuthorizePermissionInput): Promise<AccessDecision> {
    const subjectIdentity = toAuthorizationSubjectIdentity(input.identity);
    const roles = await this.grants.findRoleAssignments(subjectIdentity.membershipId);
    const subject: AuthorizationSubject = { ...subjectIdentity, roles };
    return this.policy.can(subject, input.permission, input.context);
  }
}
