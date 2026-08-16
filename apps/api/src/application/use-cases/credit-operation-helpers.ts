import { CreditReservationError } from '../../domain/economy/reservation/CreditReservationError';
import type { CreditReservation } from '../../domain/economy/reservation/CreditReservation';
import type { EconomyUnitOfWork } from '../ports/outbound/EconomyUnitOfWork';
import type {
  ReservationOperationKind,
  ReservationOperationRecord,
} from '../ports/outbound/ReservationOperationRepository';
import { EconomyOperationError } from '../errors/EconomyOperationError';
import type { CreditReservationResult } from '../ports/inbound/CreditReservationOperations';

export function validateCommand(operationId: string, resourceId: string, credits: bigint): void {
  if (!operationId.trim() || !resourceId.trim() || typeof credits !== 'bigint' || credits <= 0n) {
    throw new EconomyOperationError('INVALID_INPUT', 'Operation, resource, and positive credits are required');
  }
}

export function resultFromReservation(
  reservation: CreditReservation,
  walletBalance: bigint,
  reused: boolean,
): CreditReservationResult {
  return {
    reservationId: reservation.reservationId,
    status: reservation.status,
    reservedCredits: reservation.reservedCredits.value,
    settledCredits: reservation.settledCredits.value,
    releasedCredits: reservation.releasedCredits.value,
    remainingCredits: reservation.remainingCredits.value,
    walletBalance,
    reused,
  };
}

export function operationResult(
  operation: ReservationOperationRecord,
  reservationId: string,
  kind: ReservationOperationKind,
  credits: bigint,
): CreditReservationResult {
  assertOperationMatch(operation, reservationId, kind, credits);
  return { reservationId, ...operation.result, reused: true };
}

export async function insertOperation(
  scope: EconomyUnitOfWork,
  operation: ReservationOperationRecord,
): Promise<void> {
  if (await scope.operations.insert(operation)) return;
  throw new EconomyOperationError('DUPLICATE_OPERATION', 'Operation was already completed');
}

export function mapEconomyError(error: unknown): EconomyOperationError {
  if (error instanceof EconomyOperationError) return error;
  if (error instanceof CreditReservationError) return mapReservationError(error);
  if (error instanceof Error && error.message === 'InsufficientBalance') {
    return new EconomyOperationError('INSUFFICIENT_CREDITS', 'Wallet has insufficient credits');
  }
  return new EconomyOperationError('TRANSACTION_FAILED', 'Economic transaction failed', error);
}

function assertOperationMatch(
  operation: ReservationOperationRecord,
  reservationId: string,
  kind: ReservationOperationKind,
  credits: bigint,
): void {
  if (operation.reservationId !== reservationId || operation.kind !== kind || operation.requestedCredits !== credits) {
    throw new EconomyOperationError('DUPLICATE_OPERATION', 'Operation key belongs to another command');
  }
}

function mapReservationError(error: CreditReservationError): EconomyOperationError {
  if (error.code === 'INVALID_SETTLEMENT') {
    return new EconomyOperationError('SETTLEMENT_EXCEEDS_REMAINING', error.message);
  }
  if (error.code === 'INVALID_RELEASE') {
    return new EconomyOperationError('RELEASE_EXCEEDS_REMAINING', error.message);
  }
  return new EconomyOperationError('INVALID_RESERVATION_STATE', error.message);
}
