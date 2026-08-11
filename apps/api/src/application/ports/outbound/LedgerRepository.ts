import type { LedgerEntry } from '../../../domain/entities/LedgerEntry';
import type { Credits } from '../../../domain/value-objects/Credits';

export interface LedgerRepository {
  findByIdempotency(walletId: string, key: string): Promise<LedgerEntry | null>;
  insert(entry: LedgerEntry): Promise<void>;
  sumEarnedToday(walletId: string, dayStart: Date): Promise<Credits>;
  listByWallet(walletId: string, limit: number): Promise<LedgerEntry[]>;
}
