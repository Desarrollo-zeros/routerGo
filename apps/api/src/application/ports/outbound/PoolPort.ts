import type { CredentialDeployment } from '../../../domain/entities/CredentialDeployment';
import type { UsageWindow } from '../../../domain/value-objects/UsageWindow';

export interface PoolPort {
  getEligibleDeployments(modelId: string, now: Date): Promise<CredentialDeployment[]>;
  getUsageWindows(scopeId: string): Promise<UsageWindow[]>;
  recordUsage(deploymentId: string, tokens: number): Promise<void>;
}
