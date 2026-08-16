import type { ProviderPort } from './provider-port';

export interface ExecutionTarget {
  gatewayId: string;
  providerModelId: string;
  endpoint: Parameters<ProviderPort['call']>[1];
}

export interface ExecutionTargetPort {
  resolve(logicalModelId: string): Promise<ExecutionTarget | null>;
}
