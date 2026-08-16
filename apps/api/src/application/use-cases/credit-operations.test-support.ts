import { FixedClock } from '../ports/outbound/Clock';
import type { EconomyUnitOfWork, EconomyUnitOfWorkFactory } from '../ports/outbound/EconomyUnitOfWork';
import type { WalletRepository } from '../ports/outbound/WalletRepository';
import type { LedgerRepository } from '../ports/outbound/LedgerRepository';
import type { CreditReservationRepository } from '../ports/outbound/CreditReservationRepository';
import type {
  ReservationOperationRecord,
  ReservationOperationRepository,
} from '../ports/outbound/ReservationOperationRepository';
import { Wallet } from '../../domain/entities/Wallet';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { Credits } from '../../domain/value-objects/Credits';
import { CreditReservation } from '../../domain/economy/reservation/CreditReservation';
import { ReserveCreditsUseCase } from './ReserveCredits';
import { SettleCreditsUseCase } from './SettleCredits';
import { ReleaseCreditsUseCase } from './ReleaseCredits';

const clock = new FixedClock(new Date('2030-01-01T00:00:00Z'));

interface FakeState {
  wallets: Map<string, Wallet>;
  reservations: Map<string, CreditReservation>;
  operations: Map<string, ReservationOperationRecord>;
  ledgers: LedgerEntry[];
}

class FakeWallets implements WalletRepository {
  constructor(private readonly state: FakeState) {}
  async findById(id: string): Promise<Wallet | null> { return this.state.wallets.get(id) ?? null; }
  async findByUserId(userId: string): Promise<Wallet | null> { return [...this.state.wallets.values()].find((w) => w.userId === userId) ?? null; }
  async findByIdForUpdate(id: string): Promise<Wallet | null> { return this.findById(id); }
  async save(wallet: Wallet): Promise<void> { this.state.wallets.set(wallet.id, Wallet.create(wallet.toProps())); }
  async createForUser(userId: string): Promise<Wallet> { throw new Error(`unused:${userId}`); }
}

class FakeLedgers implements LedgerRepository {
  constructor(private readonly state: FakeState, private readonly fail: () => boolean) {}
  async findByIdempotency(walletId: string, key: string): Promise<LedgerEntry | null> {
    return this.state.ledgers.find((entry) => entry.walletId === walletId && entry.idempotencyKey === key) ?? null;
  }
  async insert(entry: LedgerEntry): Promise<void> {
    if (this.fail()) throw new Error('InjectedLedgerFailure');
    if (!await this.findByIdempotency(entry.walletId, entry.idempotencyKey)) this.state.ledgers.push(entry);
  }
  async sumEarnedToday(): Promise<Credits> { return Credits.zero(); }
  async listByWallet(): Promise<LedgerEntry[]> { return this.state.ledgers; }
}

class FakeReservations implements CreditReservationRepository {
  constructor(private readonly state: FakeState) {}
  async findById(id: string): Promise<CreditReservation | null> { return this.state.reservations.get(id) ?? null; }
  async findByIdForUpdate(id: string): Promise<CreditReservation | null> { return this.findById(id); }
  async findByOperationId(operationId: string): Promise<CreditReservation | null> {
    return [...this.state.reservations.values()].find((r) => r.operationId === operationId) ?? null;
  }
  async insert(reservation: CreditReservation): Promise<void> { this.state.reservations.set(reservation.reservationId, reservation); }
  async update(reservation: CreditReservation): Promise<void> { this.state.reservations.set(reservation.reservationId, reservation); }
}

class FakeOperations implements ReservationOperationRepository {
  constructor(private readonly state: FakeState) {}
  async findById(operationId: string): Promise<ReservationOperationRecord | null> { return this.state.operations.get(operationId) ?? null; }
  async insert(operation: ReservationOperationRecord): Promise<boolean> {
    if (this.state.operations.has(operation.operationId)) return false;
    this.state.operations.set(operation.operationId, operation);
    return true;
  }
}

class FakeFactory implements EconomyUnitOfWorkFactory {
  failLedgerInsert = false;
  constructor(readonly state: FakeState) {}
  async withTransaction<T>(work: (scope: EconomyUnitOfWork) => Promise<T>): Promise<T> {
    const backup = cloneState(this.state);
    const scope: EconomyUnitOfWork = {
      wallets: new FakeWallets(this.state),
      ledgers: new FakeLedgers(this.state, () => this.failLedgerInsert),
      reservations: new FakeReservations(this.state),
      operations: new FakeOperations(this.state),
    };
    try { return await work(scope); } catch (error) { restoreState(this.state, backup); throw error; }
  }
}

export function createContext(initial: bigint) {
  const state: FakeState = { wallets: new Map(), reservations: new Map(), operations: new Map(), ledgers: [] };
  state.wallets.set('wallet-1', Wallet.create({ id: 'wallet-1', userId: 'user-1', balance: Credits.fromBigInt(initial), version: 0, createdAt: clock.now(), updatedAt: clock.now() }));
  const factory = new FakeFactory(state);
  const ids = ['reservation-1', 'ledger-reserve', 'ledger-release'];
  const nextId = () => ids.shift() ?? `generated-${state.ledgers.length}`;
  return {
    state,
    reserve: new ReserveCreditsUseCase(factory, clock, nextId),
    settle: new SettleCreditsUseCase(factory),
    release: new ReleaseCreditsUseCase(factory, clock, nextId),
    get failLedgerInsert(): boolean { return factory.failLedgerInsert; },
    set failLedgerInsert(value: boolean) { factory.failLedgerInsert = value; },
    walletBalance: () => state.wallets.get('wallet-1')!.balance.value,
    reservation: (id: string) => state.reservations.get(id)!,
  };
}

function cloneState(source: FakeState): FakeState {
  return {
    wallets: new Map([...source.wallets].map(([id, wallet]) => [id, Wallet.create(wallet.toProps())])),
    reservations: new Map([...source.reservations].map(([id, reservation]) => [id, CreditReservation.rehydrate(reservation.toSnapshot())])),
    operations: new Map(source.operations),
    ledgers: [...source.ledgers],
  };
}

function restoreState(target: FakeState, backup: FakeState): void {
  target.wallets = backup.wallets;
  target.reservations = backup.reservations;
  target.operations = backup.operations;
  target.ledgers = backup.ledgers;
}
