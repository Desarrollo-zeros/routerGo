export type PhysicalSafetyConfig = {
  maxDurationMs: number;
  cooldownMs: number;
  maxSessionsPerDay: number;
};

export type PhysicalSafetyInput = {
  physical: boolean;
  requestedDurationMs: number;
  sessionsToday: number;
  lastCompletedAtMs?: number;
  nowMs: number;
  stopRequested: boolean;
};

export type PhysicalSafetyDecision =
  | { allowed: true; reason: 'SAFE' | 'NON_PHYSICAL_ALTERNATIVE' }
  | { allowed: false; reason: 'STOP_REQUESTED' | 'DURATION_CAP_EXCEEDED' | 'COOLDOWN_ACTIVE' | 'DAILY_SESSION_CAP_REACHED' | 'INVALID_SAFETY_INPUT' };

export function evaluatePhysicalSafety(input: PhysicalSafetyInput, config: PhysicalSafetyConfig): PhysicalSafetyDecision {
  if (!valid(input, config)) return { allowed: false, reason: 'INVALID_SAFETY_INPUT' };
  if (!input.physical) return { allowed: true, reason: 'NON_PHYSICAL_ALTERNATIVE' };
  if (input.stopRequested) return { allowed: false, reason: 'STOP_REQUESTED' };
  if (input.requestedDurationMs > config.maxDurationMs) return { allowed: false, reason: 'DURATION_CAP_EXCEEDED' };
  if (input.sessionsToday >= config.maxSessionsPerDay) return { allowed: false, reason: 'DAILY_SESSION_CAP_REACHED' };
  if (input.lastCompletedAtMs !== undefined && input.nowMs - input.lastCompletedAtMs < config.cooldownMs) return { allowed: false, reason: 'COOLDOWN_ACTIVE' };
  return { allowed: true, reason: 'SAFE' };
}

function valid(input: PhysicalSafetyInput, config: PhysicalSafetyConfig): boolean {
  return [input.requestedDurationMs, input.sessionsToday, config.maxDurationMs, config.cooldownMs, config.maxSessionsPerDay].every((value) => Number.isSafeInteger(value) && value >= 0)
    && Number.isSafeInteger(input.nowMs) && input.nowMs >= 0
    && (input.lastCompletedAtMs === undefined || (Number.isSafeInteger(input.lastCompletedAtMs) && input.lastCompletedAtMs >= 0));
}
