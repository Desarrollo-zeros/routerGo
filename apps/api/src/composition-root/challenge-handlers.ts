import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import { AuthorizationDeniedError } from '../application/errors/AuthorizationDeniedError.js';
import type { ApiKeyRequestContext } from '../application/ports/outbound/ApiKeyContextResolver.js';
import type { ApiKeyIdentityResolver } from '../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { AuthorizePermissionUseCase } from '../application/use-cases/AuthorizePermission.js';
import type { ApproveChallenge, CreateChallenge, ListChallenges, SubmitChallenge } from '../application/use-cases/ChallengeAdminUseCases.js';

export type ChallengeHandlers = { list: ListChallenges; create: CreateChallenge; submit: SubmitChallenge; approve: ApproveChallenge };
export type ChallengeDeps = { challenges: ChallengeHandlers; authenticateApiKey: (rawKey: string, scope: string) => Promise<ApiKeyRequestContext>; resolveApiKeyIdentity: ApiKeyIdentityResolver; authorizePermission: AuthorizePermissionUseCase };

export async function listChallenges(req: unknown, deps: ChallengeDeps): Promise<unknown> { await authorize(req, deps, 'challenges.read'); return deps.challenges.list.execute(); }

export async function createChallenge(req: unknown, deps: ChallengeDeps): Promise<unknown> {
  await authorize(req, deps, 'challenges.manage');
  const body = bodyOf(req);
  return deps.challenges.create.execute({ challengeKey: text(body, 'challengeKey'), challengeType: text(body, 'challengeType'), verificationStrategy: text(body, 'verificationStrategy'), content: objectOf(body, 'content'), rewardPolicy: objectOf(body, 'rewardPolicy'), maxRewardCredits: BigInt(text(body, 'maxRewardCredits')) });
}

export async function submitChallenge(req: unknown, deps: ChallengeDeps): Promise<unknown> { await authorize(req, deps, 'challenges.manage'); return deps.challenges.submit.execute(param(req)); }
export async function approveChallenge(req: unknown, deps: ChallengeDeps): Promise<unknown> { await authorize(req, deps, 'challenges.publish'); return deps.challenges.approve.execute(param(req)); }

async function authorize(req: unknown, deps: ChallengeDeps, permission: string): Promise<void> {
  const context = await deps.authenticateApiKey(bearer(req), permission);
  const identity = await deps.resolveApiKeyIdentity.resolve(context);
  if (!identity) throw new AuthenticationRequiredError();
  const decision = await deps.authorizePermission.execute({ identity, permission });
  if (!decision.allowed) throw new AuthorizationDeniedError(decision.reason);
}

function bearer(req: unknown): string { const value = (req as { headers?: Record<string, unknown> }).headers?.authorization; if (typeof value !== 'string' || !value.startsWith('Bearer ')) throw new AuthenticationRequiredError(); return value.slice(7).trim(); }
function bodyOf(req: unknown): Record<string, unknown> { const value = (req as { body?: unknown }).body; return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; }
function param(req: unknown): string { const value = (req as { params?: Record<string, unknown> }).params?.challengeId; return typeof value === 'string' ? value : ''; }
function text(body: Record<string, unknown>, key: string): string { return typeof body[key] === 'string' ? body[key] as string : ''; }
function objectOf(body: Record<string, unknown>, key: string): Record<string, unknown> { const value = body[key]; return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
