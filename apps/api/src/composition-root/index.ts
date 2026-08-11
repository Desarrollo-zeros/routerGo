import { Pool } from 'pg';
import Redis from 'ioredis';
import { PgUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgUnitOfWork';
import { CatalogPostgresAdapter } from '../infrastructure/adapters/postgres/CatalogPostgresAdapter';
import { PoolPostgresAdapter } from '../infrastructure/adapters/postgres/PoolPostgresAdapter';
import { RewardPolicy } from '../domain/policies/RewardPolicy';
import { DailyCapPolicy } from '../domain/policies/DailyCapPolicy';
import { SystemClock } from '../application/ports/outbound/Clock';
import { VerifyActivityUseCase } from '../application/use-cases/VerifyActivity';
import { CreateQuoteUseCase } from '../application/use-cases/CreateQuote';
import { CreateRunUseCase } from '../application/use-cases/CreateRun';
import { RefundRunUseCase } from '../application/use-cases/RefundRun';
import { GetCatalogUseCase } from '../application/use-cases/GetCatalog';
import { GetWalletUseCase } from '../application/use-cases/GetWallet';
import { WalletPostgresRepository } from '../infrastructure/adapters/postgres/WalletPostgresRepository';

export interface AppConfig {
  databaseUrl: string;
  redisUrl: string;
  creditsPerRep: bigint;
  maxRepsPerSession: number;
  dailyCapCredits: bigint;
}

export function createCompositionRoot(config: AppConfig) {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const redis = new Redis(config.redisUrl);
  const uowFactory = new PgUnitOfWorkFactory(pool);
  const catalog = new CatalogPostgresAdapter(pool);
  const poolPort = new PoolPostgresAdapter(pool);
  const clock = new SystemClock();
  const rewardPolicy = new RewardPolicy({ creditsPerRep: config.creditsPerRep, maxRepsPerSession: config.maxRepsPerSession });
  const dailyCapPolicy = new DailyCapPolicy({ dailyCapCredits: config.dailyCapCredits });

  const verifyActivity = new VerifyActivityUseCase(uowFactory, rewardPolicy, dailyCapPolicy, clock);
  const createQuote = new CreateQuoteUseCase(catalog, clock, uowFactory);
  const createRun = new CreateRunUseCase(uowFactory, clock);
  const refundRun = new RefundRunUseCase(uowFactory, clock);
  const getCatalog = new GetCatalogUseCase(catalog);
  const getWallet = new GetWalletUseCase(new WalletPostgresRepository(pool));

  return { pool, redis, uowFactory, catalog, poolPort, clock, verifyActivity, createQuote, createRun, refundRun, getCatalog, getWallet };
}

export type CompositionRoot = ReturnType<typeof createCompositionRoot>;
