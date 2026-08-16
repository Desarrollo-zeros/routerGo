import type { ApiKeyPrincipal } from '../inbound/ApiKeyLifecyclePort.js';

export interface ApiKeyRequestContext {
  userId: string;
  walletId: string;
  clientId: string;
  keyId: string;
  scopes: string[];
}

export interface ApiKeyContextResolver {
  resolve(principal: ApiKeyPrincipal): Promise<ApiKeyRequestContext | null>;
}
