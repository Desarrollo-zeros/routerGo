import pg from 'pg';
import Redis from 'ioredis';
import { loadRuntimeManifest } from '../config/RuntimeManifest.js';
import { WalletPostgresRepository } from '../infrastructure/adapters/postgres/WalletPostgresRepository.js';
import { LedgerPostgresRepository } from '../infrastructure/adapters/postgres/LedgerPostgresRepository.js';
import { CatalogPostgresAdapter } from '../infrastructure/adapters/postgres/CatalogPostgresAdapter.js';
import { QuotePostgresRepository } from '../infrastructure/adapters/postgres/QuotePostgresRepository.js';
import { RedisStreamAdapter } from '../infrastructure/adapters/redis/RedisStreamAdapter.js';
import { buildApp } from '../infrastructure/http/bootstrap.js';
import { SchemaRegistry } from '../infrastructure/http/schema-registry.js';
import { GetEconomyUseCase } from '../application/use-cases/GetEconomy.js';
import { SystemClock } from '../application/ports/outbound/Clock.js';
import { PgEconomyUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgEconomyUnitOfWork.js';
import { ReserveCreditsUseCase } from '../application/use-cases/ReserveCredits.js';
import { SettleCreditsUseCase } from '../application/use-cases/SettleCredits.js';
import { ReleaseCreditsUseCase } from '../application/use-cases/ReleaseCredits.js';
import { z } from 'zod';

const { Pool } = pg;

export async function createComposition() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true });
  const economyUnitOfWork = new PgEconomyUnitOfWorkFactory(pool);
  const economyClock = new SystemClock();
  const creditOperations = {
    reserve: new ReserveCreditsUseCase(economyUnitOfWork, economyClock),
    settle: new SettleCreditsUseCase(economyUnitOfWork),
    release: new ReleaseCreditsUseCase(economyUnitOfWork, economyClock),
  };
  let manifest: Awaited<ReturnType<typeof loadRuntimeManifest>>;
  try {
    manifest = await loadRuntimeManifest(pool);
    console.log(`[manifest] loaded v${manifest.version} models=${manifest.models.length} routes=${manifest.routes.length}`);
  } catch (e) {
    console.error('[manifest] load failed, using fallback empty', e);
    manifest = { version: 1, gateways: [], endpoints: [], models: [], routes: [], navigation: [], tokens: [], flags: [], poolPolicies: [] } as never;
  }
  const schemas = new SchemaRegistry();
  schemas.registerZod('verifyActivityRequest', z.object({ reps: z.number(), sessionId: z.string() }));
  schemas.registerZod('createQuoteRequest', z.object({ logicalModelId: z.string(), maxOutputTokens: z.number().optional() }));
  schemas.registerZod('createRunRequest', z.object({ quoteId: z.string() }));
  schemas.register('economyResponse', { type: 'object', properties: { go: { type: 'object' }, windows: { type: 'object' }, contribution: { type: 'object' }, dau: { type: 'number' } } });
  schemas.register('healthResponse', { type: 'object', properties: { status: { type: 'string' } } });
  schemas.register('manifestResponse', { type: 'object' });
  schemas.register('catalogResponse', { type: 'array', items: { type: 'object', additionalProperties: true } });
  schemas.register('walletResponse', { type: 'object', properties: { balance: { type: 'number' } } });
  schemas.register('ledgerResponse', { type: 'object', properties: { entries: { type: 'array', items: { type: 'object' } } } });
  schemas.register('verifyActivityResponse', { type: 'object', properties: { verified: { type: 'boolean' } } });
  schemas.register('quoteResponse', { type: 'object', properties: { quoteId: { type: 'string' } } });
  schemas.register('runResponse', { type: 'object', properties: { runId: { type: 'string' } } });
  schemas.register('streamResponse', { type: 'object' });
  const economy = new GetEconomyUseCase({
    getGoCount: async () => {
      try { const r = await pool.query("SELECT count(*)::int as c FROM credential_deployments WHERE pool_kind='GO' AND status='ACTIVE'"); return r.rows[0]?.c ?? 3; } catch { return 3; }
    },
    getWindows: async () => {
      try { const r = await pool.query('SELECT quota_scope_id as \"quotaScopeId\", window_type as \"windowType\", used_value::int as \"usedMicro\" FROM credential_usage_windows'); return r.rows; } catch { return []; }
    },
  });
  const useCases: Record<string, (req: unknown, reply: unknown) => Promise<unknown>> = {
    healthCheck: async () => ({ status: 'ok' }),
    readinessCheck: async () => ({ ready: true }),
    getManifest: async () => manifest,
    getCatalog: async () => manifest.models,
    getWallet: async () => ({ balance: 0, lifetime_earned: 0, currency: 'CREDITS' }),
    getWalletLedger: async () => ({ entries: [] }),
    verifyActivity: async (req) => ({ verified: true, input: req }),
    createQuote: async (req) => ({ quoteId: 'q-' + Date.now(), input: req }),
    createRun: async (req) => ({ runId: 'r-' + Date.now(), input: req }),
    streamRun: async () => ({ streaming: true }),
    getEconomy: async () => economy.execute(),
  };
  const walletRepo = new WalletPostgresRepository(pool);
  const ledgerRepo = new LedgerPostgresRepository(pool);
  const catalogPort = new CatalogPostgresAdapter(pool);
  const chatPorts = new QuotePostgresRepository(pool);
  const streamAdapter = new RedisStreamAdapter(redis as never);
  const sseDeps = { streamAdapter, chatPorts };
  void walletRepo; void ledgerRepo; void catalogPort;
  return { pool, redis, manifest, schemas, useCases, creditOperations, sseDeps };
}

export function buildCompositionApp(deps: Awaited<ReturnType<typeof createComposition>>) {
  return buildApp({ manifest: deps.manifest as never, useCases: deps.useCases as never, schemas: deps.schemas, sseDeps: deps.sseDeps as never });
}

