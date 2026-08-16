export type ApiQuotaScope = 'CLIENT' | 'KEY' | 'MODEL';

export interface ApiQuotaPolicy {
  id: string;
  scopeType: ApiQuotaScope;
  scopeId: string;
  modelPattern: string | null;
  requestsPerMinute: number | null;
  tokensPerMinute: bigint | null;
  creditsPerMinute: bigint | null;
}

export interface ApiQuotaLookup {
  clientId: string;
  keyId: string;
  model: string;
}

export interface ApiQuotaRepository {
  findEnabled(input: ApiQuotaLookup): Promise<ApiQuotaPolicy[]>;
}
