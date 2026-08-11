import { Credits } from '../../domain/value-objects/Credits';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import type { RefundRunPort, RefundRunInput, RefundRunOutput } from '../ports/inbound/RefundRunPort';
import type { UnitOfWorkFactory } from '../ports/outbound/UnitOfWork';
import type { Clock } from '../ports/outbound/Clock';
import { createEvent } from '../../domain/events/DomainEvent';
import { nanoid } from 'nanoid';

export class RefundRunUseCase implements RefundRunPort {
  constructor(
    private readonly uowFactory: UnitOfWorkFactory,
    private readonly clock: Clock,
  ) {}

  async execute(input: RefundRunInput): Promise<RefundRunOutput> {
    if (!input.runId || !input.userId || !input.idempotencyKey) throw new Error('InvalidInput');
    return this.uowFactory.withTransaction(async (uow) => {
      const run = await uow.runs.findById(input.runId);
      if (!run) throw new Error('RunNotFound');
      if (run.userId !== input.userId) throw new Error('Forbidden');
      if (!run.canRefund()) return { refundId: null, refunded: false, reused: false };

      const existing = await uow.ledgers.findByIdempotency(run.walletId, input.idempotencyKey);
      if (existing) return { refundId: existing.id, refunded: true, reused: true };

      const wallet = await uow.wallets.findByIdForUpdate(run.walletId);
      if (!wallet) throw new Error('WalletNotFound');

      const amount = Credits.of(BigInt(run.creditsDebited));
      wallet.credit(amount);
      await uow.wallets.save(wallet);

      const refund = LedgerEntry.create({
        id: nanoid(),
        walletId: run.walletId,
        kind: 'refund',
        amount,
        idempotencyKey: input.idempotencyKey,
        refId: run.id,
        createdAt: this.clock.now(),
        metadata: { reason: input.reason },
      });
      await uow.ledgers.insert(refund);
      run.markRefunded();
      await uow.runs.save(run);
      await uow.events.publish(createEvent('RunRefunded', run.id, { amount: amount.toString() }));
      return { refundId: refund.id, refunded: true, reused: false };
    });
  }
}
