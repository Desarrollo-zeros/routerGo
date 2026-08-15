import type { AccessDecision } from './AccessDecision';
import { allow, deny } from './AccessDecision';
import type { AuthorizationContext } from './AuthorizationContext';
import type { AuthorizationSubject } from './AuthorizationSubject';
import { isPermissionKey } from './PermissionKey';
import {
  HasPermission,
  IsActiveMembership,
  IsActiveRole,
  IsGlobalRole,
  MatchesOrganizationScope,
  or,
  type RoleEvaluation,
} from './specifications';

export class AuthorizationPolicy {
  can(subject: AuthorizationSubject, permission: string, context: AuthorizationContext = {}): AccessDecision {
    if (!isPermissionKey(permission)) return deny('MISSING_PERMISSION');
    if (!new IsActiveMembership().isSatisfiedBy(subject)) return deny('NO_ACTIVE_MEMBERSHIP');

    const evaluations = subject.roles.map((role): RoleEvaluation => ({ subject, role, context }));
    const permissionSpec = new HasPermission(permission);
    const matching = evaluations.filter((evaluation) => permissionSpec.isSatisfiedBy(evaluation));
    if (matching.length === 0) return deny('MISSING_PERMISSION');

    const activeMatching = matching.filter((evaluation) => new IsActiveRole().isSatisfiedBy(evaluation));
    if (activeMatching.length === 0) return deny('INACTIVE_ROLE');

    const scopeSpec = or(new IsGlobalRole(), new MatchesOrganizationScope());
    return activeMatching.some((evaluation) => scopeSpec.isSatisfiedBy(evaluation))
      ? allow()
      : deny('WRONG_ORGANIZATION');
  }
}
