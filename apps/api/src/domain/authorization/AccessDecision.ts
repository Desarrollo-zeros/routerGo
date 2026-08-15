export const ACCESS_DECISION_REASONS = [
  'ALLOWED',
  'MISSING_PERMISSION',
  'NO_ACTIVE_MEMBERSHIP',
  'WRONG_ORGANIZATION',
  'INACTIVE_ROLE',
] as const;

export type AccessDecisionReason = typeof ACCESS_DECISION_REASONS[number];

export interface AccessDecision {
  allowed: boolean;
  reason: AccessDecisionReason;
}

export function allow(): AccessDecision {
  return { allowed: true, reason: 'ALLOWED' };
}

export function deny(reason: Exclude<AccessDecisionReason, 'ALLOWED'>): AccessDecision {
  return { allowed: false, reason };
}
