import { nanoid } from 'nanoid';
import { CreditReservation } from '../../domain/economy/reservation/CreditReservation';
import { LedgerEntry } from '../../domain/entities/LedgerEntry';
import { Credits } from '../../domain/value-objects/Credits';
import type { Clock } from '../ports/outbound/Clock';
import type { EconomyUnitOfWork, EconomyUnitOfWorkFactory } from '../ports/outbound/EconomyUnitOfWork';
import type { ReleaseCreditsInput, ReleaseCreditsPort, CreditReservationResult } from '../ports/inbound/CreditReservationOperations';
import { EconomyOperationError } from '../errors/EconomyOperationError';
import { insertOperation, mapEconomyError, operationResult, resultFromReservation, validateCommand } from './credit-operation-helpers';
import { operationRecord } from './reservation-operation-record';

export class ReleaseCreditsUseCase implements ReleaseCreditsPort {
  constructor(
    private readonly uowFactory: EconomyUnitOfWorkFactory,
    private readonly clock: Clock,
    private readonly idGenerator: () => string = nanoid,
  ) {}

  async execute(input: ReleaseCreditsInput): Promise<CreditReservationResult> {
    try {
      validateCommand(input.operationId, input.reservationId, input.credits);
      return await this.uowFactory.withTransaction((scope) => this.release(scope, input));
    } catch (error) {
      throw mapEconomyError(error);
    }
  }

  private async release(
    scope: EconomyUnitOfWork,
    input: ReleaseCreditsInput,
  ): Promise<CreditReservationResult> {
    const known = await scope.operations.findById(input.operationId);
    if (known) return operationResult(known, input.reservationId, 'RELEASE', input.credits);
    const reservation = await scope.reservations.findByIdForUpdate(input.reservationId);
    if (!reservation) throw new EconomyOperationError('RESERVATION_NOT_FOUND', 'Reservation was not found');
    const wallet = await scope.wallets.findByIdForUpdate(reservation.walletId);
    if (!wallet) throw new EconomyOperationError('WALLET_NOT_FOUND', 'Wallet was not found');
    const raced = await scope.operations.findById(input.operationId);
    if (raced) return operationResult(raced, input.reservationId, 'RELEASE', input.credits);

    reservation.release(input.credits);
    wallet.credit(Credits.fromBigInt(input.credits));
    await scope.wallets.save(wallet);
    await scope.ledgers.insert(this.ledgerEntry(reservation, input.operationId, input.credits));
    await scope.reservations.update(reservation);
    const result = resultFromReservation(reservation, wallet.balance.value, false);
    await insertOperation(scope, operationRecord(input, 'RELEASE', result));
    return result;
  }

  private ledgerEntry(reservation: CreditReservation, operationId: string, credits: bigint): LedgerEntry {
    return LedgerEntry.create({
      id: this.idGenerator(),
      walletId: reservation.walletId,
      kind: 'refund',
      amount: Credits.fromBigInt(credits),
      idempotencyKey: `release:${operationId}`,
      refId: reservation.reservationId,
      createdAt: this.clock.now(),
      metadata: { operation: 'CREDIT_RELEASE' },
    });
  }
}
