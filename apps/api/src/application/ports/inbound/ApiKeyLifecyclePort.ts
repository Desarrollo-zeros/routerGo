export interface IssueApiKeyInput {
  clientId: string;
  scopes: string[];
  expiresAt?: Date | null;
}

export interface IssueApiKeyOutput {
  keyId: string;
  rawKey: string;
  prefix: string;
  scopes: string[];
  expiresAt: Date | null;
}

export interface ApiKeyPrincipal {
  keyId: string;
  clientId: string;
  scopes: string[];
}

export interface ApiKeyLifecyclePort {
  issue(input: IssueApiKeyInput): Promise<IssueApiKeyOutput>;
  revoke(keyId: string): Promise<void>;
  rotate(keyId: string): Promise<IssueApiKeyOutput>;
  authenticate(rawKey: string, requiredScope?: string): Promise<ApiKeyPrincipal>;
}
