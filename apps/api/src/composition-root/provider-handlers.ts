import type { GetProviderAnalyticsPort } from '../application/ports/inbound/GetProviderAnalyticsPort.js';
import type { ApiKeyRequestContext } from '../application/ports/outbound/ApiKeyContextResolver.js';
import type { ApiKeyIdentityResolver } from '../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { AuthorizePermissionUseCase } from '../application/use-cases/AuthorizePermission.js';
import { AuthorizationDeniedError } from '../application/errors/AuthorizationDeniedError.js';
import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';

export async function providerAnalyticsRead(req: unknown, deps: ProviderAnalyticsDeps): Promise<unknown> {
  const context = await authenticate(req, deps.authenticateApiKey);
  const identity = await deps.identity.resolve(context);
  if (!identity) throw new AuthenticationRequiredError();
  const decision = await deps.authorize.execute({ identity, permission: 'providers.read' });
  if (!decision.allowed) throw new AuthorizationDeniedError(decision.reason);
  return deps.analytics.execute({ quotaWarningPct: 75, quotaExceededPct: 90 });
}

export type ProviderAnalyticsDeps = {
  analytics: GetProviderAnalyticsPort;
  authenticateApiKey: (rawKey: string, scope: string) => Promise<ApiKeyRequestContext>;
  identity: ApiKeyIdentityResolver;
  authorize: AuthorizePermissionUseCase;
};

async function authenticate(req: unknown, authenticator: ProviderAnalyticsDeps['authenticateApiKey']): Promise<ApiKeyRequestContext> {
  const authorization = (req as { headers?: Record<string, unknown> }).headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new AuthenticationRequiredError();
  return authenticator(authorization.slice(7).trim(), 'providers.read');
}
