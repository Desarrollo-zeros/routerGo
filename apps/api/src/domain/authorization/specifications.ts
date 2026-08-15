import type { AuthorizationContext } from './AuthorizationContext';
import type { AuthorizationSubject } from './AuthorizationSubject';
import type { PermissionKey } from './PermissionKey';
import type { RoleAssignment } from './RoleAssignment';

export interface RoleEvaluation {
  subject: AuthorizationSubject;
  role: RoleAssignment;
  context: AuthorizationContext;
}

export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
}

export class HasPermission implements Specification<RoleEvaluation> {
  constructor(private readonly permission: PermissionKey) {}

  isSatisfiedBy(candidate: RoleEvaluation): boolean {
    return candidate.role.permissionKeys.includes(this.permission);
  }
}

export class IsActiveMembership implements Specification<AuthorizationSubject> {
  isSatisfiedBy(candidate: AuthorizationSubject): boolean {
    return candidate.membershipIsActive;
  }
}

export class IsActiveSubject implements Specification<AuthorizationSubject> {
  isSatisfiedBy(candidate: AuthorizationSubject): boolean {
    return candidate.isActive;
  }
}

export class IsActiveRole implements Specification<RoleEvaluation> {
  isSatisfiedBy(candidate: RoleEvaluation): boolean {
    return candidate.role.isActive;
  }
}

export class IsGlobalRole implements Specification<RoleEvaluation> {
  isSatisfiedBy(candidate: RoleEvaluation): boolean {
    return candidate.role.scope === 'GLOBAL' && candidate.role.organizationId === null;
  }
}

export class MatchesOrganizationScope implements Specification<RoleEvaluation> {
  isSatisfiedBy(candidate: RoleEvaluation): boolean {
    const { role, subject, context } = candidate;
    return role.scope === 'ORGANIZATION'
      && role.organizationId !== null
      && role.organizationId === subject.organizationId
      && role.organizationId === context.resourceOrganizationId;
  }
}

export function or<T>(left: Specification<T>, right: Specification<T>): Specification<T> {
  return { isSatisfiedBy: (candidate) => left.isSatisfiedBy(candidate) || right.isSatisfiedBy(candidate) };
}
