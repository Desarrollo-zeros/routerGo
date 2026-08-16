import type { GetPublishedContent } from '../application/use-cases/GetPublishedContent.js';
import type { ListPublishedContent } from '../application/use-cases/ListPublishedContent.js';
import type { PublishContent } from '../application/use-cases/PublishContent.js';
import type { ApiKeyRequestContext } from '../application/ports/outbound/ApiKeyContextResolver.js';
import type { ApiKeyIdentityResolver } from '../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { AuthorizePermissionUseCase } from '../application/use-cases/AuthorizePermission.js';
import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import { AuthorizationDeniedError } from '../application/errors/AuthorizationDeniedError.js';

export function listPublishedContent(useCase: ListPublishedContent): Promise<unknown> {
  return useCase.execute();
}

export async function getPublishedContent(req: unknown, useCase: GetPublishedContent): Promise<unknown> {
  const params = (req as { params?: Record<string, unknown> }).params;
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  if (!slug) throw new Error('CONTENT_SLUG_REQUIRED');
  const content = await useCase.execute(slug);
  if (!content) throw new Error('CONTENT_NOT_FOUND');
  return content;
}

export async function adminPublishedContent(req: unknown, deps: { reader: ListPublishedContent; authenticate: (key: string, scope: string) => Promise<ApiKeyRequestContext>; identity: ApiKeyIdentityResolver; authorize: AuthorizePermissionUseCase }): Promise<unknown> {
  const authorization = (req as { headers?: Record<string, unknown> }).headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new AuthenticationRequiredError();
  const context = await deps.authenticate(authorization.slice(7).trim(), 'cms.read');
  const identity = await deps.identity.resolve(context);
  if (!identity) throw new AuthenticationRequiredError();
  const decision = await deps.authorize.execute({ identity, permission: 'cms.read' });
  if (!decision.allowed) throw new AuthorizationDeniedError(decision.reason);
  return deps.reader.execute();
}

export async function publishContent(req: unknown, deps: { publisher: PublishContent; authenticate: (key: string, scope: string) => Promise<ApiKeyRequestContext>; identity: ApiKeyIdentityResolver; authorize: AuthorizePermissionUseCase }): Promise<unknown> {
  const authorization = (req as { headers?: Record<string, unknown> }).headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new AuthenticationRequiredError();
  const context = await deps.authenticate(authorization.slice(7).trim(), 'cms.publish');
  const identity = await deps.identity.resolve(context);
  if (!identity) throw new AuthenticationRequiredError();
  const decision = await deps.authorize.execute({ identity, permission: 'cms.publish' });
  if (!decision.allowed) throw new AuthorizationDeniedError(decision.reason);
  const body = (req as { body?: Record<string, unknown> }).body ?? {};
  if (typeof body.slug !== 'string' || typeof body.title !== 'string' || typeof body.body !== 'string') throw new Error('CONTENT_INPUT_INVALID');
  return deps.publisher.execute({ slug: body.slug, title: body.title, body: body.body }, context.userId);
}
