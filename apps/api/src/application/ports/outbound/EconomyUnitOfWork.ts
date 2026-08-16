import type { LedgerRepository } from './LedgerRepository';
import type { ReservationOperationRepository } from './ReservationOperationRepository';
import type { CreditReservationRepository } from './CreditReservationRepository';
import type { WalletRepository } from './WalletRepository';

export interface EconomyUnitOfWork {
  wallets: WalletRepository;
  ledgers: LedgerRepository;
  reservations: CreditReservationRepository;
  operations: ReservationOperationRepository;
}

export interface EconomyUnitOfWorkFactory {
  withTransaction<T>(work: (scope: EconomyUnitOfWork) => Promise<T>): Promise<T>;
}
