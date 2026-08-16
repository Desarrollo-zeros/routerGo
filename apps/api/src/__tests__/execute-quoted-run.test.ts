import { describe, expect, it } from 'vitest';
import { ChatQuote } from '../domain/entities/ChatQuote';
import { ChatRun } from '../domain/entities/ChatRun';
import { Credits } from '../domain/value-objects/Credits';
import { FixedClock } from '../application/ports/outbound/Clock';
import { ExecuteQuotedRunUseCase } from '../application/use-cases/ExecuteQuotedRun';
import { QuoteUsagePricing } from '../application/ports/outbound/UsagePricingPort';
import { ProviderExecutionError, ExecuteQuotedRunError } from '../application/errors/ExecuteQuotedRunError';
import type { ProviderPort, ProviderResponse } from '../application/ports/outbound/provider-port';
import type { UnitOfWork, UnitOfWorkFactory } from '../application/ports/outbound/UnitOfWork';
import type { QuoteRepository } from '../application/ports/outbound/QuoteRepository';
import type { RunRepository } from '../application/ports/outbound/RunRepository';
import type { ChatQuoteProps } from '../domain/entities/ChatQuote';
import type { CreditReservationResult, ReserveCreditsPort, SettleCreditsPort, ReleaseCreditsPort } from '../application/ports/inbound/CreditReservationOperations';
import type { WalletRepository } from '../application/ports/outbound/WalletRepository';
import type { LedgerRepository } from '../application/ports/outbound/LedgerRepository';
import type { EventBus } from '../application/ports/outbound/EventBus';

const now = new Date('2030-01-01T00:00:00Z');
const endpoint = { baseUrl: 'http://provider.test', pathTemplate: '/chat', strategyKey: 'fake' };

class MemoryQuotes implements QuoteRepository {
  constructor(private readonly values: Map<string, ChatQuote>) {}
  async findById(id: string): Promise<ChatQuote | null> { return this.values.get(id) ?? null; }
  async findByIdempotency(): Promise<ChatQuote | null> { return null; }
  async save(value: ChatQuote): Promise<void> { this.values.set(value.id, value); }
}

class MemoryRuns implements RunRepository {
  readonly values = new Map<string, ChatRun>();
  async findById(id: string): Promise<ChatRun | null> { return this.values.get(id) ?? null; }
  async findByIdempotency(_walletId: string, key: string): Promise<ChatRun | null> {
    return [...this.values.values()].find((run) => run.toProps().idempotencyKey === key) ?? null;
  }
  async save(value: ChatRun): Promise<void> { this.values.set(value.id, value); }
}

class UnusedWallets implements WalletRepository {
  async findById(): Promise<null> { return null; }
  async findByUserId(): Promise<null> { return null; }
  async findByIdForUpdate(): Promise<null> { return null; }
  async save(): Promise<void> { throw new Error('unused'); }
  async createForUser(): Promise<never> { throw new Error('unused'); }
}

class UnusedLedgers implements LedgerRepository {
  async findByIdempotency(): Promise<null> { return null; }
  async insert(): Promise<void> { throw new Error('unused'); }
  async sumEarnedToday(): Promise<Credits> { return Credits.zero(); }
  async listByWallet(): Promise<never[]> { return []; }
}

class UnusedEvents implements EventBus {
  async publish(): Promise<void> {}
  async publishMany(): Promise<void> {}
}

class MemoryUow implements UnitOfWork {
  readonly wallets = new UnusedWallets();
  readonly ledgers = new UnusedLedgers();
  readonly events = new UnusedEvents();
  constructor(readonly quotes: MemoryQuotes, readonly runs: MemoryRuns) {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
}

class MemoryUowFactory implements UnitOfWorkFactory {
  constructor(readonly quotes: MemoryQuotes, readonly runs: MemoryRuns) {}
  async start(): Promise<UnitOfWork> { return new MemoryUow(this.quotes, this.runs); }
  async withTransaction<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    return work(new MemoryUow(this.quotes, this.runs));
  }
}

class FakeProvider implements ProviderPort {
  calls = 0;
  response: ProviderResponse = { id: 'provider-1', content: 'ok', raw: {}, billableUserCredits: 72n, providerCostMicrousd: 14n, usage: { inputTokens: 3, outputTokens: 5 } };
  failure: Error | undefined;
  async call(): Promise<ProviderResponse> {
    this.calls += 1;
    if (this.failure) throw this.failure;
    return this.response;
  }
  async stream(): Promise<ProviderResponse> { throw new Error('stream not used in this unit suite'); }
}

class FakeCredits implements ReserveCreditsPort, SettleCreditsPort, ReleaseCreditsPort {
  reserved = 0n;
  settled = 0n;
  released = 0n;
  failReserve = false;
  failCompensation = false;
  async execute(input: { operationId: string; walletId?: string; credits?: bigint; reservationId?: string; expiresAt?: Date }): Promise<CreditReservationResult> {
    if (input.operationId.endsWith(':reserve')) {
      if (this.failReserve) throw new Error('InsufficientBalance');
      this.reserved += input.credits ?? 0n;
    } else if (input.operationId.endsWith(':settle')) {
      if (this.failCompensation) throw new Error('SettlementUnavailable');
      this.settled += input.credits ?? 0n;
    } else {
      if (this.failCompensation) throw new Error('ReleaseUnavailable');
      this.released += input.credits ?? 0n;
    }
    return { reservationId: input.reservationId ?? 'reservation-1', status: 'RESERVED', reservedCredits: this.reserved, settledCredits: this.settled, releasedCredits: this.released, remainingCredits: this.reserved - this.settled - this.released, walletBalance: 1000n - this.reserved + this.released, reused: false };
  }
}

function quote(expiresAt = new Date(now.getTime() + 60_000)): ChatQuote {
  const props: ChatQuoteProps = { id: 'quote-1', userId: 'user-1', walletId: 'wallet-1', modelId: 'model-1', tier: 'STANDARD', creditPrice: Credits.of(100n), estimatedPlatformCostMicrousd: 20n, pricingVersion: 'catalog-v2', maxOutputTokens: 100, idempotencyKey: 'quote-key', createdAt: new Date(now.getTime() - 1_000), expiresAt };
  return ChatQuote.create(props);
}

function setup(allowed = true) {
  const quotes = new MemoryQuotes(new Map([['quote-1', quote()]]));
  const runs = new MemoryRuns();
  const credits = new FakeCredits();
  const provider = new FakeProvider();
  const useCase = new ExecuteQuotedRunUseCase({
    uowFactory: new MemoryUowFactory(quotes, runs), creditOperations: { reserve: credits, settle: credits, release: credits },
    budget: { evaluate: async () => allowed ? ({ allowed: true, reason: 'ALLOWED', requestedAmount: 20n, remainingAmount: 1000n }) : ({ allowed: false, reason: 'BUDGET_EXHAUSTED', requestedAmount: 20n, remainingAmount: 0n }) },
    provider, target: { resolve: async () => ({ gatewayId: 'gateway-1', providerModelId: 'provider-model-1', endpoint }) }, pricing: new QuoteUsagePricing(), clock: new FixedClock(now), idGenerator: () => 'run-1',
  });
  return { useCase, credits, provider, runs };
}

describe('ExecuteQuotedRunUseCase', () => {
  it('reserves before provider and settles actual usage', async () => {
    const context = setup();
    const result = await context.useCase.execute({ userId: 'user-1', quoteId: 'quote-1', idempotencyKey: 'run-key', messages: [{ role: 'user', content: 'hi' }], stream: false });
    expect(result.status).toBe('COMPLETED');
    expect(context.provider.calls).toBe(1);
    expect(context.credits.reserved).toBe(100n);
    expect(context.credits.settled).toBe(72n);
    expect(context.credits.released).toBe(28n);
    expect(context.runs.values.get('run-1')?.providerRequestId).toBe('provider-1');
  });

  it('does not call provider when the budget denies', async () => {
    const context = setup(false);
    await expect(context.useCase.execute({ userId: 'user-1', quoteId: 'quote-1', idempotencyKey: 'run-key', messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ code: 'BUDGET_DENIED' });
    expect(context.provider.calls).toBe(0);
  });

  it('releases the full reservation on pre-delivery provider failure', async () => {
    const context = setup();
    context.provider.failure = new ProviderExecutionError('upstream down', { deliveryStarted: false, requestId: 'provider-2' });
    await expect(context.useCase.execute({ userId: 'user-1', quoteId: 'quote-1', idempotencyKey: 'run-key', messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ code: 'PROVIDER_EXECUTION_FAILED' });
    expect(context.credits.settled).toBe(0n);
    expect(context.credits.released).toBe(100n);
    expect(context.runs.values.get('run-1')?.economyStatus).toBe('RELEASED');
  });

  it('fails closed when provider usage exceeds the reservation', async () => {
    const context = setup();
    context.provider.response.billableUserCredits = 101n;
    await expect(context.useCase.execute({ userId: 'user-1', quoteId: 'quote-1', idempotencyKey: 'run-key', messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ code: 'USAGE_EXCEEDS_RESERVATION' });
    expect(context.provider.calls).toBe(1);
    expect(context.runs.values.get('run-1')?.economyStatus).toBe('RECONCILIATION_REQUIRED');
  });

  it('claims idempotency before provider execution', async () => {
    const context = setup();
    await context.useCase.execute({ userId: 'user-1', quoteId: 'quote-1', idempotencyKey: 'run-key', messages: [{ role: 'user', content: 'hi' }] });
    await expect(context.useCase.execute({ userId: 'user-1', quoteId: 'quote-1', idempotencyKey: 'run-key', messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({ code: 'RUN_ALREADY_COMPLETED' });
    expect(context.provider.calls).toBe(1);
  });
});
