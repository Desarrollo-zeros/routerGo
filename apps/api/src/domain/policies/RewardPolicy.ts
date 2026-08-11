import { Credits } from '../value-objects/Credits';

export interface RewardConfig {
  creditsPerRep: bigint;
  maxRepsPerSession: number;
}

export class RewardPolicy {
  constructor(private readonly config: RewardConfig) {}

  calculate(reps: number): Credits {
    if (reps <= 0) return Credits.zero();
    const capped = Math.min(reps, this.config.maxRepsPerSession);
    return Credits.of(BigInt(capped) * this.config.creditsPerRep);
  }

  validate(reps: number): void {
    if (!Number.isInteger(reps) || reps < 0) throw new Error('InvalidReps');
    if (reps > this.config.maxRepsPerSession) throw new Error('RepsExceedMax');
  }
}
