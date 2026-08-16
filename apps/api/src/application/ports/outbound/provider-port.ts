export interface ProviderRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  userId?: string;
  idempotencyKey?: string;
}

export interface ProviderResponse {
  id: string;
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
  raw: unknown;
  requestId?: string;
  deliveryStarted?: boolean;
  billableUserCredits?: bigint;
  providerCostMicrousd?: bigint;
}

export interface ProviderStreamChunk {
  delta: string;
  done: boolean;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ProviderPort {
  call(req: ProviderRequest, endpoint: { baseUrl: string; pathTemplate: string; strategyKey: string }): Promise<ProviderResponse>;
  stream(
    req: ProviderRequest,
    endpoint: { baseUrl: string; pathTemplate: string; strategyKey: string },
    onChunk: (chunk: ProviderStreamChunk) => void,
  ): Promise<ProviderResponse>;
}

export interface PoolDeployment {
  id: string;
  gatewayId: string;
  poolKind: 'ZEN_FREE' | 'GO' | 'ZEN_PAID';
  quotaScopeId: string;
  status: string;
  cooldownUntil: Date | null;
}

export interface UsageWindowRow {
  quotaScopeId: string;
  windowType: string;
  usedValue: bigint;
  limitValue: bigint;
}

export interface PoolPort {
  refresh(): Promise<string[]>;
  getEligibleIds(): Promise<string[]>;
}
