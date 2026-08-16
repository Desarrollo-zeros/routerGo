import type { RuntimeManifest } from '../config/RuntimeManifest.js';
import type { GetCatalogPort } from '../application/ports/inbound/GetCatalogPort.js';
import type { GetEconomyPort } from '../application/ports/inbound/GetEconomyPort.js';
import type { GetWalletPort } from '../application/ports/inbound/GetWalletPort.js';
import type { ListModelsPort } from '../application/ports/inbound/ListModelsPort.js';
import type { UseCaseHandler, UseCaseRegistry } from '../infrastructure/http/dynamic-route-registry.js';
import { AuthenticationRequiredError, RouteNotReadyError } from '../infrastructure/http/http-errors.js';

interface RegistryDeps {
  manifest: RuntimeManifest;
  catalog: GetCatalogPort;
  models: ListModelsPort;
  wallet: GetWalletPort;
  economy: GetEconomyPort;
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
