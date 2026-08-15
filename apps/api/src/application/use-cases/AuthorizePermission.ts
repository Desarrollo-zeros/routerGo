import type { AccessDecision } from '../../domain/authorization/AccessDecision';
import type { AuthorizationContext } from '../../domain/authorization/AuthorizationContext';
import type {
  AuthorizationSubject,
  AuthorizationSubjectIdentity,
} from '../../domain/authorization/AuthorizationSubject';
import { AuthorizationPolicy } from '../../domain/authorization/AuthorizationPolicy';
import type { AuthorizationGrantReader } from '../ports/outbound/AuthorizationGrantReader';

export interface AuthorizePermissionInput {
  subject: AuthorizationSubjectIdentity;
  permission: string;
  context?: AuthorizationContext;
}

export class AuthorizePermissionUseCase {
  constructor(
    private readonly grants: AuthorizationGrantReader,
    private readonly policy: AuthorizationPolicy = new AuthorizationPolicy(),
  ) {}

  async execute(input: AuthorizePermissionInput): Promise<AccessDecision> {
    const roles = await this.grants.findRoleAssignments(input.subject.membershipId);
    const subject: AuthorizationSubject = { ...input.subject, roles };
    return this.policy.can(subject, input.permission, input.context);
  }
}
