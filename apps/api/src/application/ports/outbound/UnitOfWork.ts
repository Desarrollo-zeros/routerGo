import type { WalletRepository } from './WalletRepository';
import type { LedgerRepository } from './LedgerRepository';
import type { QuoteRepository } from './QuoteRepository';
import type { RunRepository } from './RunRepository';
import type { EventBus } from './EventBus';

export interface UnitOfWork {
  wallets: WalletRepository;
  ledgers: LedgerRepository;
  quotes: QuoteRepository;
  runs: RunRepository;
  events: EventBus;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface UnitOfWorkFactory {
  start(): Promise<UnitOfWork>;
  withTransaction<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T>;
}
