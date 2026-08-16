import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { ChatQuote } from '../domain/entities/ChatQuote';
import { Credits } from '../domain/value-objects/Credits';
import { FixedClock } from '../application/ports/outbound/Clock';
import { PgUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgUnitOfWork';
import { PgEconomyUnitOfWorkFactory } from '../infrastructure/adapters/postgres/PgEconomyUnitOfWork';
import { ReserveCreditsUseCase } from '../application/use-cases/ReserveCredits';
import { SettleCreditsUseCase } from '../application/use-cases/SettleCredits';
import { ReleaseCreditsUseCase } from '../application/use-cases/ReleaseCredits';
import { ExecuteQuotedRunUseCase } from '../application/use-cases/ExecuteQuotedRun';
import type { ProviderPort, ProviderResponse } from '../application/ports/outbound/provider-port';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const clock = new FixedClock(new Date('2030-01-01T00:00:00Z'));
const suffix = `t025_${Date.now()}`;
const ids = { user: `${suffix}_user`, wallet: `${suffix}_wallet`, quote: `${suffix}_quote`, run: `${suffix}_run` };

class DelayedProvider implements ProviderPort {
  calls = 0;
  async call(): Promise<ProviderResponse> {
    this.calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 40));
    return { id: 'pg-provider-request', content: 'ok', raw: {}, billableUserCredits: 20n, usage: { inputTokens: 2, outputTokens: 3 } };
  }
  async stream(): Promise<ProviderResponse> { throw new Error('stream not used'); }
}

beforeAll(async () => {
  await pool.query('INSERT INTO users(id,email) VALUES ($1,$2)', [ids.user, `${ids.user}@test.local`]);
  await pool.query('INSERT INTO wallets(id,user_id,balance,version) VALUES ($1,$2,500,0)', [ids.wallet, ids.user]);
  const quote = ChatQuote.create({ id: ids.quote, userId: ids.user, walletId: ids.wallet, modelId: 'gpt-5.6-luna', tier: 'STANDARD', creditPrice: Credits.of(120n), estimatedPlatformCostMicrousd: 10n, pricingVersion: 't025-test', maxOutputTokens: 64, idempotencyKey: `${suffix}_quote_key`, createdAt: clock.now(), expiresAt: new Date(clock.now().getTime() + 60_000) });
  await new PgUnitOfWorkFactory(pool).withTransaction(async (uow) => uow.quotes.save(quote));
});

afterAll(async () => {
  await pool.query('DELETE FROM credit_reservation_operations WHERE reservation_id IN (SELECT id FROM credit_reservations WHERE run_id=$1)', [ids.run]);
  await pool.query('DELETE FROM credit_reservations WHERE run_id=$1', [ids.run]);
  await pool.query('DELETE FROM chat_runs WHERE id=$1', [ids.run]);
  await pool.query('DELETE FROM chat_quotes WHERE id=$1', [ids.quote]);
  await pool.query('DELETE FROM ledger_entries WHERE wallet_id=$1', [ids.wallet]);
  await pool.query('DELETE FROM wallets WHERE id=$1', [ids.wallet]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
  await pool.end();
});

describe('quoted run PostgreSQL claim', () => {
  it('calls provider once for duplicate concurrent idempotency keys', async () => {
    const provider = new DelayedProvider();
    const economy = new PgEconomyUnitOfWorkFactory(pool);
    const useCase = new ExecuteQuotedRunUseCase({
      uowFactory: new PgUnitOfWorkFactory(pool),
      creditOperations: { reserve: new ReserveCreditsUseCase(economy, clock, () => `${suffix}_reservation`), settle: new SettleCreditsUseCase(economy), release: new ReleaseCreditsUseCase(economy, clock, () => `${suffix}_release`) },
      budget: { evaluate: async () => ({ allowed: true, reason: 'ALLOWED', requestedAmount: 10n, remainingAmount: 1000n }) },
      provider, target: { resolve: async () => ({ gatewayId: 'gw-go', providerModelId: 'gpt-5.6-luna', endpoint: { baseUrl: 'http://provider.test', pathTemplate: '/chat', strategyKey: 'fake' } }) },
      pricing: { price: () => 20n }, clock, idGenerator: () => ids.run,
    });
    const input = { userId: ids.user, quoteId: ids.quote, idempotencyKey: `${suffix}_run_key`, messages: [{ role: 'user' as const, content: 'hello' }] };
    const results = await Promise.allSettled([useCase.execute(input), useCase.execute(input)]);
    expect(results.filter((result) => result.status === 'rejected').length).toBeLessThanOrEqual(1);
    expect(provider.calls).toBe(1);
    const run = await pool.query('SELECT status,economy_status,provider_request_id,reservation_id FROM chat_runs WHERE id=$1', [ids.run]);
    expect(run.rows[0]).toMatchObject({ status: 'COMPLETED', economy_status: 'SETTLED', provider_request_id: 'pg-provider-request' });
    expect(run.rows[0].reservation_id).toBeTruthy();
  });
});
