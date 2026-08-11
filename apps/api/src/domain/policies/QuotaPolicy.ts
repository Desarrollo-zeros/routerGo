import type { UsageWindow } from '../value-objects/UsageWindow';

export interface QuotaPolicyConfig {
  warnThreshold: number;
  blockThreshold: number;
}

export class QuotaPolicy {
  constructor(private readonly config: QuotaPolicyConfig) {
    if (config.warnThreshold >= config.blockThreshold) {
      throw new Error('warn must be < block');
    }
  }

  isBlocked(window: UsageWindow): boolean {
    return window.isAtOrAbove(this.config.blockThreshold);
  }

  isWarn(window: UsageWindow): boolean {
    return window.isAtOrAbove(this.config.warnThreshold);
  }

  isAvailable(window: UsageWindow): boolean {
    return !this.isBlocked(window);
  }

  filterAvailable(windows: UsageWindow[]): UsageWindow[] {
    return windows.filter((w) => this.isAvailable(w));
  }

  // Specification combinators
  static quotaAvailableSpec(policy: QuotaPolicy) {
    return (w: UsageWindow) => policy.isAvailable(w);
  }

  static modelEnabledSpec(enabled: boolean) {
    return () => enabled;
  }
}
