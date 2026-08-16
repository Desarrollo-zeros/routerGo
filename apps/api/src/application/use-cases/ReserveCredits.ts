import { nanoid } from 'nanoid';
import { CreditReservation } from '../../domain/economy/reservation/CreditReservation';
import { Credits } from '../../domain/value-objects/Credits';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import type { Clock } from '../ports/outbound/Clock';
import type { EconomyUnitOfWork, EconomyUnitOfWorkFactory } from '../ports/outbound/EconomyUnitOfWork';
import type { ReserveCreditsInput, ReserveCreditsPort, CreditReservationResult } from '../ports/inbound/CreditReservationOperations';
import { EconomyOperationError } from '../errors/EconomyOperationError';
import { mapEconomyError, resultFromReservation, validateCommand } from './credit-operation-helpers';

export class ReserveCreditsUseCase implements ReserveCreditsPort {
  constructor(
    private readonly uowFactory: EconomyUnitOfWorkFactory,
    private readonly clock: Clock,
    private readonly idGenerator: () => string = nanoid,
  ) {}

  async execute(input: ReserveCreditsInput): Promise<CreditReservationResult> {
    try {
      validateCommand(input.operationId, input.walletId, input.credits);
      return await this.uowFactory.withTransaction((scope) => this.reserve(scope, input));
    } catch (error) {
      throw mapEconomyError(error);
    }
  }

  private async reserve(
    scope: EconomyUnitOfWork,
    input: ReserveCreditsInput,
  ): Promise<CreditReservationResult> {
    const known = await scope.reservations.findByOperationId(input.operationId);
    if (known) return this.reused(scope, input, known);

    const wallet = await scope.wallets.findByIdForUpdate(input.walletId);
    if (!wallet) throw new EconomyOperationError('WALLET_NOT_FOUND', 'Wallet was not found');
    const raced = await scope.reservations.findByOperationId(input.operationId);
    if (raced) return this.reused(scope, input, raced);
    const amount = Credits.fromBigInt(input.credits);
    if (!wallet.canDebit(amount)) throw new EconomyOperationError('INSUFFICIENT_CREDITS', 'Wallet has insufficient credits');

    const reservation = CreditReservation.create({
      reservationId: input.reservationId ?? this.idGenerator(),
      walletId: input.walletId,
      operationId: input.operationId,
      reservedCredits: input.credits,
      createdAt: this.clock.now(),
      expiresAt: input.expiresAt,
    });
    wallet.debit(amount);
    await scope.wallets.save(wallet);
    await scope.reservations.insert(reservation);
    await scope.ledgers.insert(this.ledgerEntry(reservation));
    return resultFromReservation(reservation, wallet.balance.value, false);
  }

  private async reused(
    scope: EconomyUnitOfWork,
    input: ReserveCreditsInput,
    reservation: CreditReservation,
  ): Promise<CreditReservationResult> {
    assertReserveMatch(input, reservation);
    const wallet = await scope.wallets.findById(reservation.walletId);
    if (!wallet) throw new EconomyOperationError('WALLET_NOT_FOUND', 'Wallet was not found');
    return resultFromReservation(reservation, wallet.balance.value, true);
  }

  private ledgerEntry(reservation: CreditReservation): LedgerEntry {
    return LedgerEntry.create({
      id: this.idGenerator(),
      walletId: reservation.walletId,
      kind: 'spend',
      amount: reservation.reservedCredits,
      idempotencyKey: `reserve:${reservation.operationId}`,
      refId: reservation.reservationId,
      createdAt: this.clock.now(),
      metadata: { operation: 'CREDIT_RESERVE' },
    });
  }
}

function assertReserveMatch(input: ReserveCreditsInput, reservation: CreditReservation): void {
  if (reservation.walletId !== input.walletId || reservation.reservedCredits.value !== input.credits
    || (input.reservationId !== undefined && reservation.reservationId !== input.reservationId)) {
    throw new EconomyOperationError('DUPLICATE_OPERATION', 'Operation key belongs to another reservation');
  }
  if (input.expiresAt && reservation.expiresAt?.getTime() !== input.expiresAt.getTime()) {
    throw new EconomyOperationError('DUPLICATE_OPERATION', 'Operation key belongs to another reservation');
  }
}
