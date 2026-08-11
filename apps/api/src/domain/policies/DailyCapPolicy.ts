import { Credits } from '../value-objects/Credits';

export interface DailyCapConfig {
  dailyCapCredits: bigint;
}

export class DailyCapPolicy {
  constructor(private readonly config: DailyCapConfig) {}

  canEarn(todayEarned: Credits, nextReward: Credits): boolean {
    const total = todayEarned.add(nextReward);
    return total.value <= this.config.dailyCapCredits;
  }

  remaining(todayEarned: Credits): Credits {
    const rem = this.config.dailyCapCredits - todayEarned.value;
    return Credits.of(rem > 0n ? rem : 0n);
  }

  cappedReward(todayEarned: Credits, requested: Credits): Credits {
    const rem = this.remaining(todayEarned);
    if (requested.gte(rem) && !rem.isZero()) return rem;
    if (requested.gte(rem) && rem.isZero()) return Credits.zero();
    return requested;
  }

  validate(todayEarned: Credits): void {
    if (todayEarned.isNegative()) throw new Error('todayEarned must be >=0');
  }
}
