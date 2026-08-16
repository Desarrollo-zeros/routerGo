import pg from 'pg';
import Redis from 'ioredis';
import { loadRequiredManifest } from './manifest-loader.js';
import { createUseCaseRegistry } from './use-case-registry.js';
import { WalletPostgresRepository } from '../infrastructure/adapters/postgres/WalletPostgresRepository.js';
import { CatalogPostgresAdapter } from '../infrastructure/adapters/postgres/CatalogPostgresAdapter.js';
import { RedisStreamAdapter } from '../infrastructure/adapters/redis/RedisStreamAdapter.js';
import { buildApp } from '../infrastructure/http/bootstrap.js';
import { SchemaRegistry } from '../infrastructure/http/schema-registry.js';
import { GetEconomyUseCase } from '../application/use-cases/GetEconomy.js';
import { GetCatalogUseCase } from '../application/use-cases/GetCatalog.js';
import { ListModelsUseCase } from '../application/use-cases/ListModels.js';
import { GetWalletUseCase } from '../application/use-cases/GetWallet.js';
import { SystemClock } from '../application/ports/outbound/Clock.js';
import { PgEconomyUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgEconomyUnitOfWork.js';
import { ReserveCreditsUseCase } from '../application/use-cases/ReserveCredits.js';
import { SettleCreditsUseCase } from '../application/use-cases/SettleCredits.js';
import { ReleaseCreditsUseCase } from '../application/use-cases/ReleaseCredits.js';
import { z } from 'zod';
import { PgUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgUnitOfWork.js';
import { PostgresExecutionTargetAdapter } from '../infrastructure/adapters/postgres/PostgresExecutionTargetAdapter.js';
import { PostgresBudgetEvaluator } from '../infrastructure/adapters/postgres/PostgresBudgetEvaluator.js';
import { HttpProviderAdapter } from '../infrastructure/adapters/providers/HttpProviderAdapter.js';
import { GatewayAdapterFactory } from '../infrastructure/adapters/providers/gateway-adapter-factory.js';
import { CreateQuoteUseCase } from '../application/use-cases/CreateQuote.js';
import { ExecuteQuotedRunUseCase } from '../application/use-cases/ExecuteQuotedRun.js';
import { ChatCompletionsUseCase } from '../application/use-cases/ChatCompletions.js';
import { QuoteUsagePricing } from '../application/ports/outbound/UsagePricingPort.js';
import { ExponentialBackoff } from '../infrastructure/reliability/exponential-backoff.js';
import { DefaultErrorClassifier } from '../infrastructure/reliability/error-classifier.js';
import { RetryPolicy } from '../infrastructure/reliability/retry-policy.js';
import { SystemSleeper } from '../infrastructure/reliability/system-sleeper.js';
import { ReliabilityExecutor } from '../infrastructure/reliability/reliability-executor.js';
import { CircuitBreaker } from '../infrastructure/reliability/circuit-breaker.js';
import { ApiKeyPostgresRepository } from '../infrastructure/adapters/postgres/ApiKeyPostgresRepository.js';
import { ApiKeyContextPostgresAdapter } from '../infrastructure/adapters/postgres/ApiKeyContextPostgresAdapter.js';
import { Sha256ApiKeyHasher } from '../infrastructure/security/Sha256ApiKeyHasher.js';
import { ApiKeyLifecycleUseCase } from '../application/use-cases/ApiKeyLifecycle.js';
import { ApiQuotaPostgresRepository } from '../infrastructure/adapters/postgres/ApiQuotaPostgresRepository.js';
import { RedisApiQuotaCounter } from '../infrastructure/adapters/redis/RedisApiQuotaCounter.js';
import { CheckApiQuotaUseCase } from '../application/use-cases/CheckApiQuota.js';
import { ResponsesUseCase } from '../application/use-cases/Responses.js';
import { GetProviderAnalyticsUseCase } from '../application/use-cases/GetProviderAnalytics.js';
import { HttpProviderHealthProbe } from '../infrastructure/adapters/providers/HttpProviderHealthProbe.js';
import { PostgresProviderAnalyticsSource } from '../infrastructure/adapters/postgres/PostgresProviderAnalyticsSource.js';
import { PostgresProviderAnalyticsAlertSink } from '../infrastructure/adapters/postgres/PostgresProviderAnalyticsAlertSink.js';

const { Pool } = pg;

export async function createComposition() {
  const pool = new Pool({ connectionString: databaseUrl() });
  const redis = new Redis(redisUrl(), { lazyConnect: true });
  const manifest = await loadRequiredManifest(pool);
  const schemas = createSchemas();
  const catalog = new CatalogPostgresAdapter(pool);
  const wallet = new WalletPostgresRepository(pool);
  const economyUnitOfWork = new PgEconomyUnitOfWorkFactory(pool);
  const unitOfWork = new PgUnitOfWorkFactory(pool);
  const economyClock = new SystemClock();
  const creditOperations = {
    reserve: new ReserveCreditsUseCase(economyUnitOfWork, economyClock),
    settle: new SettleCreditsUseCase(economyUnitOfWork),
    release: new ReleaseCreditsUseCase(economyUnitOfWork, economyClock),
  };
  const economy = createEconomy(pool);
  const catalogUseCase = new GetCatalogUseCase(catalog);
  const target = new PostgresExecutionTargetAdapter(pool);
  const provider = createProvider(economyClock);
  const createQuote = new CreateQuoteUseCase(catalog, economyClock, unitOfWork);
  const executeRun = new ExecuteQuotedRunUseCase({
    uowFactory: unitOfWork, creditOperations, budget: new PostgresBudgetEvaluator(pool),
    provider, target, pricing: new QuoteUsagePricing(), clock: economyClock,
  });
  const quota = new CheckApiQuotaUseCase({ policies: new ApiQuotaPostgresRepository(pool), counter: new RedisApiQuotaCounter(redis) });
  const chatCompletions = new ChatCompletionsUseCase({ createQuote, executeRun, clock: economyClock, quota });
  const providerAnalytics = new GetProviderAnalyticsUseCase(
    new PostgresProviderAnalyticsSource(pool, new HttpProviderHealthProbe()),
    new PostgresProviderAnalyticsAlertSink(pool),
  );
  const useCases = createUseCaseRegistry({
    manifest, catalog: catalogUseCase, models: new ListModelsUseCase(catalogUseCase),
    wallet: new GetWalletUseCase(wallet), economy,
    chatCompletions, responses: new ResponsesUseCase(chatCompletions),
    authenticateApiKey: createApiKeyAuthenticator(pool),
  });
  const streams = new RedisStreamAdapter(redis as never);
  return { pool, redis, manifest, schemas, useCases, creditOperations, providerAnalytics, sseDeps: { streams } };
}

function createApiKeyAuthenticator(pool: pg.Pool) {
  const lifecycle = new ApiKeyLifecycleUseCase({ repository: new ApiKeyPostgresRepository(pool), hasher: new Sha256ApiKeyHasher(), clock: new SystemClock() });
  const context = new ApiKeyContextPostgresAdapter(pool);
  return async (rawKey: string, scope: string) => {
    const principal = await lifecycle.authenticate(rawKey, scope);
    const resolved = await context.resolve(principal);
    if (!resolved) throw new Error('API_KEY_CONTEXT_NOT_FOUND');
    return resolved;
  };
}

function createProvider(clock: SystemClock): HttpProviderAdapter {
  const reliability = new ReliabilityExecutor({
    classifier: new DefaultErrorClassifier(),
    retry: new RetryPolicy({ maxAttempts: 2 }, new ExponentialBackoff({ baseDelayMs: 100, maxDelayMs: 1000, jitterRatio: 0.2 })),
    sleeper: new SystemSleeper(), clock,
  });
  const breaker = new CircuitBreaker({ failureThreshold: 3, openDurationMs: 10_000, clock });
  return new HttpProviderAdapter({ reliability, breaker, factory: new GatewayAdapterFactory() });
}

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo';
}

function redisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

function createEconomy(pool: pg.Pool): GetEconomyUseCase {
  return new GetEconomyUseCase({
    getGoCount: async () => queryGoCount(pool),
    getWindows: async () => queryWindows(pool),
    getOperatorRevenueMicro: async () => queryRevenue(pool),
    getProviderCostMicro: async () => queryProviderCost(pool),
    getRewardLiabilityCredits: async () => queryRewardLiability(pool),
  });
}

async function queryGoCount(pool: pg.Pool): Promise<number> {
  const result = await pool.query("SELECT count(*)::int as c FROM credential_deployments WHERE pool_kind='GO' AND status='ACTIVE'");
  return result.rows[0]?.c ?? 0;
}

async function queryWindows(pool: pg.Pool): Promise<Array<{ quotaScopeId: string; windowType: string; usedMicro: number }>> {
  const result = await pool.query('SELECT quota_scope_id as "quotaScopeId", window_type as "windowType", used_value::int as "usedMicro" FROM credential_usage_windows');
  return result.rows;
}

async function queryRevenue(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ total: string }>("SELECT COALESCE(SUM(net_revenue_microusd), 0)::text AS total FROM revenue_entries WHERE status='FINALIZED'");
  return Number(result.rows[0]?.total ?? 0);
}

async function queryProviderCost(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ total: string }>("SELECT COALESCE(SUM(cost_microusd), 0)::text AS total FROM provider_cost_entries WHERE source <> 'REVERSAL'");
  return Number(result.rows[0]?.total ?? 0);
}

async function queryRewardLiability(pool: pg.Pool): Promise<number> {
  const result = await pool.query<{ total: string }>('SELECT COALESCE(SUM(balance), 0)::text AS total FROM wallets');
  return Number(result.rows[0]?.total ?? 0);
}

function createSchemas(): SchemaRegistry {
  const schemas = new SchemaRegistry();
  schemas.registerZod('verifyActivityRequest', z.object({ reps: z.number(), sessionId: z.string() }));
  schemas.registerZod('createQuoteRequest', z.object({ logicalModelId: z.string(), maxOutputTokens: z.number().optional() }));
  schemas.registerZod('createRunRequest', z.object({ quoteId: z.string() }));
  schemas.register('economyResponse', { type: 'object', properties: { go: { type: 'object' }, windows: { type: 'object' }, contribution: { type: 'object' }, unitEconomics: { type: 'object' }, dau: { type: 'number' } } });
  schemas.register('healthResponse', { type: 'object', properties: { status: { type: 'string' } } });
  schemas.register('manifestResponse', { type: 'object' });
  schemas.register('catalogResponse', { type: 'object', properties: { models: { type: 'array', items: { type: 'object', properties: { logicalId: { type: 'string' }, tier: { type: 'string' }, creditPrice: { type: 'string' }, enabled: { type: 'boolean' } } } } } });
  schemas.register('modelsResponse', { type: 'object', required: ['object', 'data'], properties: { object: { const: 'list' }, data: { type: 'array', items: { type: 'object', required: ['id', 'object', 'created', 'owned_by'], properties: { id: { type: 'string' }, object: { const: 'model' }, created: { type: 'number' }, owned_by: { type: 'string' } } } } } });
  schemas.register('chatCompletionsRequest', { type: 'object', required: ['model', 'messages'], properties: { model: { type: 'string' }, messages: { type: 'array', minItems: 1, items: { type: 'object', required: ['role', 'content'], properties: { role: { enum: ['system', 'user', 'assistant'] }, content: { type: 'string' } }, additionalProperties: false } }, max_tokens: { type: 'integer', minimum: 1 }, temperature: { type: 'number' }, stream: { type: 'boolean' } }, additionalProperties: false });
  schemas.register('chatCompletionsResponse', { type: 'object', required: ['id', 'object', 'created', 'model', 'choices', 'usage'], properties: { id: { type: 'string' }, object: { const: 'chat.completion' }, created: { type: 'number' }, model: { type: 'string' }, choices: { type: 'array' }, usage: { type: 'object' } } });
  schemas.register('responsesRequest', { type: 'object', required: ['model', 'input'], properties: { model: { type: 'string' }, input: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] }, max_output_tokens: { type: 'integer', minimum: 1 }, stream: { type: 'boolean' } }, additionalProperties: false });
  schemas.register('responsesResponse', { type: 'object', required: ['id', 'object', 'status', 'model', 'output'], properties: { id: { type: 'string' }, object: { const: 'response' }, status: { const: 'completed' }, model: { type: 'string' }, output: { type: 'array' } } });
  schemas.register('walletResponse', { type: 'object', properties: { walletId: { type: 'string' }, balance: { type: 'string' }, version: { type: 'number' } } });
  schemas.register('ledgerResponse', { type: 'object', properties: { entries: { type: 'array', items: { type: 'object' } } } });
  schemas.register('verifyActivityResponse', { type: 'object', properties: { verified: { type: 'boolean' } } });
  schemas.register('quoteResponse', { type: 'object', properties: { quoteId: { type: 'string' } } });
  schemas.register('runResponse', { type: 'object', properties: { runId: { type: 'string' } } });
  schemas.register('streamResponse', { type: 'object' });
  return schemas;
}

export function buildCompositionApp(deps: Awaited<ReturnType<typeof createComposition>>) {
  return buildApp({ manifest: deps.manifest, useCases: deps.useCases, schemas: deps.schemas, sseDeps: deps.sseDeps });
}
