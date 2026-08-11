export interface PoolCachePort {
  setEligible(ids: string[]): Promise<void>;
  getEligible(): Promise<string[]>;
  ttlSeconds(): number;
}

export interface ClockPort {
  now(): Date;
}

export interface DeploymentRow {
  id: string;
  gatewayId: string;
  poolKind: string;
  quotaScopeId: string;
  status: string;
  cooldownUntil: Date | null;
}

export interface WindowRow {
  quotaScopeId: string;
  windowType: string;
  usedValue: bigint;
  limitValue: bigint;
}
