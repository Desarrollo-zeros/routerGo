export interface AdminRuntimeClient {
  publish(accessToken: string, operationId: string): Promise<PublishedRuntimeManifest>;
  rollback(accessToken: string, operationId: string, targetVersion: number): Promise<PublishedRuntimeManifest>;
}

export interface PublishedRuntimeManifest {
  version: number;
  contentHash: string;
  manifest: unknown;
}

export class HttpAdminRuntimeClient implements AdminRuntimeClient {
  constructor(private readonly baseUrl = '') {}

  publish(accessToken: string, operationId: string): Promise<PublishedRuntimeManifest> {
    return this.send('/admin/runtime/publish', accessToken, operationId);
  }

  rollback(accessToken: string, operationId: string, targetVersion: number): Promise<PublishedRuntimeManifest> {
    return this.send('/admin/runtime/rollback', accessToken, operationId, { targetVersion });
  }

  private async send(path: string, accessToken: string, operationId: string, body?: unknown): Promise<PublishedRuntimeManifest> {
    if (!accessToken.trim() || !operationId.trim()) throw new Error('admin_runtime_credentials_required');
    const response = await fetch(`${this.baseUrl}${path}`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'idempotency-key': operationId }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`admin_runtime_${response.status}`);
    const value = await response.json() as Partial<PublishedRuntimeManifest>;
    if (typeof value.version !== 'number' || typeof value.contentHash !== 'string' || !value.manifest) throw new Error('admin_runtime_invalid_response');
    return value as PublishedRuntimeManifest;
  }
}
