import { Credits } from '../../domain/value-objects/Credits';
import { ChatRun } from '../../domain/entities/ChatRun';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import type { CreateRunPort, CreateRunInput, CreateRunOutput } from '../ports/inbound/CreateRunPort';
import type { UnitOfWorkFactory, UnitOfWork } from '../ports/outbound/UnitOfWork';
import type { Clock } from '../ports/outbound/Clock';
import { createEvent } from '../../domain/events/DomainEvent';
import { nanoid } from 'nanoid';

export class CreateRunUseCase implements CreateRunPort {
  constructor(
    private readonly uowFactory: UnitOfWorkFactory,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateRunInput): Promise<CreateRunOutput> {
    assertValidInput(input);
    return this.uowFactory.withTransaction((uow) => this.executeInTx(uow, input));
  }

  private async executeInTx(uow: UnitOfWork, input: CreateRunInput): Promise<CreateRunOutput> {
    const quote = await loadQuoteOrThrow(uow, input, this.clock);
    const existing = await uow.runs.findByIdempotency(quote.walletId, input.idempotencyKey);
    if (existing) return { runId: existing.id, status: existing.status, reused: true };
    const wallet = await loadWalletForDebit(uow, quote);
    wallet.debit(quote.creditPrice);
    await uow.wallets.save(wallet);
    const run = await persistRun(uow, input, quote, this.clock);
    await persistSpend(uow, { runId: run.id, quote, idempotencyKey: input.idempotencyKey }, this.clock);
    await uow.events.publish(createEvent('RunCreated', run.id, { quoteId: quote.id }));
    return { runId: run.id, status: run.status, reused: false };
  }
}

function assertValidInput(input: CreateRunInput): void {
  if (!input.userId || !input.quoteId || !input.idempotencyKey) throw new Error('InvalidInput');
}

async function loadQuoteOrThrow(uow: UnitOfWork, input: CreateRunInput, clock: Clock) {
  const quote = await uow.quotes.findById(input.quoteId);
  if (!quote) throw new Error('QuoteNotFound');
  if (quote.isExpired(clock.now())) throw new Error('QuoteExpired');
  if (!quote.isOwnedBy(input.userId)) throw new Error('Forbidden');
  return quote;
}

async function loadWalletForDebit(uow: UnitOfWork, quote: { walletId: string; creditPrice: Credits }) {
  const wallet = await uow.wallets.findByIdForUpdate(quote.walletId);
  if (!wallet) throw new Error('WalletNotFound');
  if (!wallet.canDebit(quote.creditPrice)) throw new Error('InsufficientBalance');
  return wallet;
}

async function persistRun(uow: UnitOfWork, input: CreateRunInput, quote: { id: string; walletId: string; modelId: string; creditPrice: Credits }, clock: Clock) {
  const run = ChatRun.create({
    id: nanoid(),
    quoteId: quote.id,
    userId: input.userId,
    walletId: quote.walletId,
    modelId: quote.modelId,
    status: 'PENDING',
    creditsDebited: quote.creditPrice.toString(),
    idempotencyKey: input.idempotencyKey,
    createdAt: clock.now(),
    updatedAt: clock.now(),
  });
  await uow.runs.save(run);
  return run;
}

type SpendParams = { runId: string; quote: { walletId: string; creditPrice: Credits }; idempotencyKey: string };

async function persistSpend(uow: UnitOfWork, params: SpendParams, clock: Clock): Promise<void> {
  const spend = LedgerEntry.create({
    id: nanoid(),
    walletId: params.quote.walletId,
    kind: 'spend',
    amount: params.quote.creditPrice,
    idempotencyKey: params.idempotencyKey,
    refId: params.runId,
    createdAt: clock.now(),
  });
  await uow.ledgers.insert(spend);
}
