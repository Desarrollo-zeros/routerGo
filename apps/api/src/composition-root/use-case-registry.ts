import type { RuntimeManifest } from '../config/RuntimeManifest.js';
import type { GetCatalogPort } from '../application/ports/inbound/GetCatalogPort.js';
import type { GetEconomyPort } from '../application/ports/inbound/GetEconomyPort.js';
import type { GetWalletPort } from '../application/ports/inbound/GetWalletPort.js';
import type { ListModelsPort } from '../application/ports/inbound/ListModelsPort.js';
import type { UseCaseHandler, UseCaseRegistry } from '../infrastructure/http/dynamic-route-registry.js';
import { AuthenticationRequiredError, RouteNotReadyError } from '../infrastructure/http/http-errors.js';
import type { ChatCompletionsPort, ChatCompletionMessage } from '../application/ports/inbound/ChatCompletionsPort.js';
import type { ResponsesPort } from '../application/ports/inbound/ResponsesPort.js';

interface RegistryDeps {
  manifest: RuntimeManifest;
  catalog: GetCatalogPort;
  models: ListModelsPort;
  wallet: GetWalletPort;
  economy: GetEconomyPort;
  chatCompletions: ChatCompletionsPort;
  responses: ResponsesPort;
}

export function createUseCaseRegistry(deps: RegistryDeps): UseCaseRegistry {
  return {
    healthCheck: async () => ({ status: 'ok' }),
    readinessCheck: async () => ({ ready: true }),
    getManifest: async () => deps.manifest,
    getCatalog: async () => deps.catalog.execute(),
    listModels: async () => deps.models.execute(),
    getWallet: async (req) => deps.wallet.execute(readWalletInput(req)),
    getWalletLedger: notReady,
    verifyActivity: notReady,
    createQuote: notReady,
    createRun: notReady,
    streamRun: notReady,
    getEconomy: async () => deps.economy.execute(),
    chatCompletions: async (req) => deps.chatCompletions.execute(readChatInput(req)),
    responses: async (req) => deps.responses.execute(readResponsesInput(req)),
  };
}

const notReady: UseCaseHandler = async () => {
  throw new RouteNotReadyError();
};

function readWalletInput(req: unknown): { userId: string; walletId: string } {
  const user = (req as { user?: { userId?: unknown; walletId?: unknown } }).user;
  if (typeof user?.userId !== 'string' || typeof user.walletId !== 'string') {
    throw new AuthenticationRequiredError();
  }
  return { userId: user.userId, walletId: user.walletId };
}

function readChatInput(req: unknown) {
  const request = req as { body?: Record<string, unknown>; headers?: Record<string, unknown>; user?: { userId?: unknown; walletId?: unknown } };
  const userId = request.user?.userId;
  const walletId = request.user?.walletId;
  const key = request.headers?.['idempotency-key'];
  if (typeof userId !== 'string' || typeof walletId !== 'string' || typeof key !== 'string') throw new AuthenticationRequiredError();
  const body = request.body ?? {};
  return { userId, walletId, idempotencyKey: key, model: String(body.model ?? ''), messages: body.messages as ChatCompletionMessage[], maxTokens: body.max_tokens as number | undefined, temperature: body.temperature as number | undefined, stream: body.stream as boolean | undefined };
}

function readResponsesInput(req: unknown) {
  const request = req as { body?: Record<string, unknown>; headers?: Record<string, unknown>; user?: { userId?: unknown; walletId?: unknown } };
  const userId = request.user?.userId;
  const walletId = request.user?.walletId;
  const key = request.headers?.['idempotency-key'];
  if (typeof userId !== 'string' || typeof walletId !== 'string' || typeof key !== 'string') throw new AuthenticationRequiredError();
  const body = request.body ?? {};
  return { userId, walletId, idempotencyKey: key, model: String(body.model ?? ''), input: body.input as string | ChatCompletionMessage[], maxOutputTokens: body.max_output_tokens as number | undefined, stream: body.stream as boolean | undefined };
}
