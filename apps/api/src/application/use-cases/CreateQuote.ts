import { Credits } from '../../domain/value-objects/Credits';
import { ChatQuote } from '../../domain/entities/ChatQuote';
import type { CreateQuotePort, CreateQuoteInput, CreateQuoteOutput } from '../ports/inbound/CreateQuotePort';
import type { CatalogPort } from '../ports/outbound/CatalogPort';
import type { Clock } from '../ports/outbound/Clock';
import type { UnitOfWorkFactory } from '../ports/outbound/UnitOfWork';
import { nanoid } from 'nanoid';

const QUOTE_TTL_MS = 5 * 60 * 1000;

export class CreateQuoteUseCase implements CreateQuotePort {
  constructor(
    private readonly catalog: CatalogPort,
    private readonly clock: Clock,
    private readonly uowFactory: UnitOfWorkFactory,
  ) {}

  async execute(input: CreateQuoteInput): Promise<CreateQuoteOutput> {
    if (!input.userId || !input.walletId || !input.modelId || !input.idempotencyKey) throw new Error('InvalidInput');
    const model = await this.catalog.getModel(input.modelId);
    if (!model) throw new Error('ModelNotFound');
    if (!model.enabled) throw new Error('ModelDisabled');

    return this.uowFactory.withTransaction(async (uow) => {
      const existing = await uow.quotes.findByIdempotency(input.walletId, input.idempotencyKey);
      if (existing) return this.reused(existing);
      const price = Credits.of(model.creditPrice);
      const now = this.clock.now();
      const quote = ChatQuote.create({
        id: nanoid(),
        userId: input.userId,
        walletId: input.walletId,
        modelId: input.modelId,
        tier: model.tier,
        creditPrice: price,
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
        expiresAt: new Date(now.getTime() + QUOTE_TTL_MS),
      });
      await uow.quotes.save(quote);
      return { quoteId: quote.id, creditPrice: price.toString(), expiresAt: quote.expiresAt.toISOString(), reused: false };
    });
  }

  private reused(q: ChatQuote): CreateQuoteOutput {
    return { quoteId: q.id, creditPrice: q.creditPrice.toString(), expiresAt: q.expiresAt.toISOString(), reused: true };
  }
}
