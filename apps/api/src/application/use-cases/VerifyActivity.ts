import { Credits } from '../../domain/value-objects/Credits';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { RewardPolicy } from '../../domain/policies/RewardPolicy';
import { DailyCapPolicy } from '../../domain/policies/DailyCapPolicy';
import type { VerifyActivityPort, VerifyActivityInput, VerifyActivityOutput } from '../ports/inbound/VerifyActivityPort';
import type { UnitOfWorkFactory } from '../ports/outbound/UnitOfWork';
import type { Clock } from '../ports/outbound/Clock';
import { createEvent } from '../../domain/events/DomainEvent';
import { nanoid } from 'nanoid';

export class VerifyActivityUseCase implements VerifyActivityPort {
  constructor(
    private readonly uowFactory: UnitOfWorkFactory,
    private readonly rewardPolicy: RewardPolicy,
    private readonly dailyCapPolicy: DailyCapPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(input: VerifyActivityInput): Promise<VerifyActivityOutput> {
    this.validate(input);
    return this.uowFactory.withTransaction(async (uow) => {
      const existing = await uow.ledgers.findByIdempotency(input.walletId, input.idempotencyKey);
      if (existing) return this.reused(existing);

      const wallet = await uow.wallets.findByIdForUpdate(input.walletId);
      if (!wallet) throw new Error('WalletNotFound');

      const reward = this.rewardPolicy.calculate(input.reps);
      if (reward.isZero()) throw new Error('NoReward');

      const dayStart = this.dayStart(this.clock.now());
      const earnedToday = await uow.ledgers.sumEarnedToday(input.walletId, dayStart);
      if (!this.dailyCapPolicy.canEarn(earnedToday, reward)) throw new Error('DailyCapExceeded');

      const effective = this.capped(earnedToday, reward);
      wallet.credit(effective);
      await uow.wallets.save(wallet);

      const entry = LedgerEntry.create({
        id: nanoid(),
        walletId: input.walletId,
        kind: 'earn',
        amount: effective,
        idempotencyKey: input.idempotencyKey,
        refId: input.sessionId,
        createdAt: this.clock.now(),
        metadata: { reps: input.reps },
      });
      await uow.ledgers.insert(entry);
      await uow.events.publish(createEvent('CreditsEarned', wallet.id, { amount: effective.toString() }));
      return { ledgerId: entry.id, credits: effective.toString(), newBalance: wallet.balance.toString(), reused: false };
    });
  }

  private validate(i: VerifyActivityInput): void {
    if (!i.userId || !i.walletId || !i.sessionId || !i.idempotencyKey) throw new Error('InvalidInput');
    if (!Number.isInteger(i.reps) || i.reps < 0) throw new Error('InvalidReps');
  }

  private reused(e: LedgerEntry): VerifyActivityOutput {
    return { ledgerId: e.id, credits: e.amount.toString(), newBalance: '', reused: true };
  }

  private capped(today: Credits, reward: Credits): Credits {
    const rem = this.dailyCapPolicy.remaining(today);
    if (rem.gte(reward)) return reward;
    return rem;
  }

  private dayStart(d: Date): Date {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }
}
