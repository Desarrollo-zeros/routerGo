import type { ReservationStatus } from '../../../domain/economy/reservation/CreditReservation';

export type ReservationOperationKind = 'SETTLE' | 'RELEASE';

export interface ReservationOperationResult {
  status: ReservationStatus;
  reservedCredits: bigint;
  settledCredits: bigint;
  releasedCredits: bigint;
  remainingCredits: bigint;
  walletBalance: bigint;
}

export interface ReservationOperationRecord {
  operationId: string;
  reservationId: string;
  kind: ReservationOperationKind;
  requestedCredits: bigint;
  result: ReservationOperationResult;
}

export interface ReservationOperationRepository {
  findById(operationId: string): Promise<ReservationOperationRecord | null>;
  insert(operation: ReservationOperationRecord): Promise<boolean>;
}
