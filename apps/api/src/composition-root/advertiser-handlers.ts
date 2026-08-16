import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import { AuthorizationDeniedError } from '../application/errors/AuthorizationDeniedError.js';
import type { ApiKeyRequestContext } from '../application/ports/outbound/ApiKeyContextResolver.js';
import type { ApiKeyIdentityResolver } from '../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { AuthorizePermissionUseCase } from '../application/use-cases/AuthorizePermission.js';
import type { GetAdvertiserAccount, ListAdvertiserCampaigns, ListAdvertiserCreatives, GetAdvertiserAnalytics, CreateAdvertiserCampaign, CreateAdvertiserCreative, SubmitAdvertiserCampaign } from '../application/use-cases/AdvertiserUseCases.js';

export type AdvertiserHandlers = { account: GetAdvertiserAccount; campaigns: ListAdvertiserCampaigns; creatives: ListAdvertiserCreatives; analytics: GetAdvertiserAnalytics; createCampaign: CreateAdvertiserCampaign; createCreative: CreateAdvertiserCreative; submitCampaign: SubmitAdvertiserCampaign };
export type AdvertiserDeps = { advertiser: AdvertiserHandlers; authenticateApiKey: (rawKey: string, scope: string) => Promise<ApiKeyRequestContext>; resolveApiKeyIdentity: ApiKeyIdentityResolver; authorizePermission: AuthorizePermissionUseCase };

export async function advertiserRead(req: unknown, deps: AdvertiserDeps, operation: 'account' | 'campaigns' | 'creatives' | 'analytics'): Promise<unknown> {
  const identity = await identityFor(req, deps, 'campaigns.read');
  return deps.advertiser[operation].execute(identity.organizationId);
}

export async function advertiserWrite(req: unknown, deps: AdvertiserDeps, operation: 'createCampaign' | 'createCreative' | 'submitCampaign'): Promise<unknown> {
  const identity = await identityFor(req, deps, 'campaigns.manage');
  const body = requestBody(req);
  if (operation === 'createCampaign') return deps.advertiser.createCampaign.execute({ organizationId: identity.organizationId, name: stringField(body, 'name'), budgetMicro: bigintField(body, 'budgetMicro'), sponsoredLabel: stringField(body, 'sponsoredLabel', 'Sponsored') });
  if (operation === 'createCreative') return deps.advertiser.createCreative.execute({ organizationId: identity.organizationId, campaignId: stringField(body, 'campaignId'), kind: stringField(body, 'kind'), payload: objectField(body, 'payload') });
  return deps.advertiser.submitCampaign.execute({ organizationId: identity.organizationId, campaignId: routeParam(req, 'campaignId') });
}

async function identityFor(req: unknown, deps: AdvertiserDeps, permission: string) {
  const context = await deps.authenticateApiKey(bearer(req), permission);
  const identity = await deps.resolveApiKeyIdentity.resolve(context);
  if (!identity) throw new AuthenticationRequiredError();
  const decision = await deps.authorizePermission.execute({ identity, permission, context: { resourceOrganizationId: identity.organizationId } });
  if (!decision.allowed) throw new AuthorizationDeniedError(decision.reason);
  return identity;
}

function bearer(req: unknown): string { const value = (req as { headers?: Record<string, unknown> }).headers?.authorization; if (typeof value !== 'string' || !value.startsWith('Bearer ')) throw new AuthenticationRequiredError(); return value.slice(7).trim(); }
function requestBody(req: unknown): Record<string, unknown> { const body = (req as { body?: unknown }).body; return typeof body === 'object' && body !== null ? body as Record<string, unknown> : {}; }
function routeParam(req: unknown, key: string): string { const params = (req as { params?: Record<string, unknown> }).params; return typeof params?.[key] === 'string' ? params[key] as string : ''; }
function stringField(body: Record<string, unknown>, key: string, fallback = ''): string { return typeof body[key] === 'string' ? body[key] as string : fallback; }
function bigintField(body: Record<string, unknown>, key: string): bigint { try { return BigInt(stringField(body, key)); } catch { throw new Error('INVALID_CAMPAIGN'); } }
function objectField(body: Record<string, unknown>, key: string): Record<string, unknown> { const value = body[key]; return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
