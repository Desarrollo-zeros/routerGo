import type { ClockPort, DeploymentRow, PoolCachePort, WindowRow } from '../ports/outbound/pool-cache-port';

const DEFAULT_THRESHOLD = 80;
const ELIGIBLE_KEY = 'pool:eligible_deployments';

export interface PoolControllerDeps {
  deploymentRows: () => Promise<DeploymentRow[]>;
  windowRows: () => Promise<WindowRow[]>;
  cache: PoolCachePort;
  clock: ClockPort;
  thresholdPct?: number;
}

export class PoolController {
  private readonly threshold: number;

  constructor(private readonly deps: PoolControllerDeps) {
    this.threshold = deps.thresholdPct ?? DEFAULT_THRESHOLD;
  }

  async refresh(): Promise<string[]> {
    const deployments = await this.deps.deploymentRows();
    const windows = await this.deps.windowRows();
    const eligible = this.filterEligible(deployments, windows);
    await this.deps.cache.setEligible(eligible);
    return eligible;
  }

  async getEligible(): Promise<string[]> {
    return this.deps.cache.getEligible();
  }

  private filterEligible(deployments: DeploymentRow[], windows: WindowRow[]): string[] {
    const blockedScopes = this.blockedScopes(windows);
    const now = this.deps.clock.now();
    return deployments.filter((d) => this.isEligible(d, blockedScopes, now)).map((d) => d.id);
  }

  private blockedScopes(windows: WindowRow[]): Set<string> {
    const blocked = new Set<string>();
    for (const w of windows) {
      if (w.limitValue === 0n) continue;
      const pct = Number((w.usedValue * 100n) / w.limitValue);
      if (pct >= this.threshold) blocked.add(w.quotaScopeId);
    }
    return blocked;
  }

  private isEligible(d: DeploymentRow, blocked: Set<string>, now: Date): boolean {
    if (d.status !== 'ACTIVE') return false;
    if (d.cooldownUntil && d.cooldownUntil.getTime() > now.getTime()) return false;
    if (blocked.has(d.quotaScopeId)) return false;
    return true;
  }

  static eligibleKey(): string {
    return ELIGIBLE_KEY;
  }
}
