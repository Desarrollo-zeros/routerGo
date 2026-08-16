import type { EconomyUnitOfWork, EconomyUnitOfWorkFactory } from '../ports/outbound/EconomyUnitOfWork';
import type { SettleCreditsInput, SettleCreditsPort, CreditReservationResult } from '../ports/inbound/CreditReservationOperations';
import { EconomyOperationError } from '../errors/EconomyOperationError';
import {
  insertOperation,
  mapEconomyError,
  operationResult,
  resultFromReservation,
  validateCommand,
} from './credit-operation-helpers';
import { operationRecord } from './reservation-operation-record';

export class SettleCreditsUseCase implements SettleCreditsPort {
  constructor(private readonly uowFactory: EconomyUnitOfWorkFactory) {}

  async execute(input: SettleCreditsInput): Promise<CreditReservationResult> {
    try {
      validateCommand(input.operationId, input.reservationId, input.credits);
      return await this.uowFactory.withTransaction((scope) => this.settle(scope, input));
    } catch (error) {
      throw mapEconomyError(error);
    }
  }

  private async settle(
    scope: EconomyUnitOfWork,
    input: SettleCreditsInput,
  ): Promise<CreditReservationResult> {
    const known = await scope.operations.findById(input.operationId);
    if (known) return operationResult(known, input.reservationId, 'SETTLE', input.credits);
    const reservation = await scope.reservations.findByIdForUpdate(input.reservationId);
    if (!reservation) throw new EconomyOperationError('RESERVATION_NOT_FOUND', 'Reservation was not found');
    const raced = await scope.operations.findById(input.operationId);
    if (raced) return operationResult(raced, input.reservationId, 'SETTLE', input.credits);

    reservation.settle(input.credits);
    const wallet = await scope.wallets.findById(reservation.walletId);
    if (!wallet) throw new EconomyOperationError('WALLET_NOT_FOUND', 'Wallet was not found');
    await scope.reservations.update(reservation);
    const result = resultFromReservation(reservation, wallet.balance.value, false);
    await insertOperation(scope, operationRecord(input, 'SETTLE', result));
    return result;
  }
}
