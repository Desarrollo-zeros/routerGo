import type { CreditReservationResult } from '../ports/inbound/CreditReservationOperations';
import type {
  ReservationOperationKind,
  ReservationOperationRecord,
} from '../ports/outbound/ReservationOperationRepository';

export function operationRecord(
  input: { operationId: string; reservationId: string; credits: bigint },
  kind: ReservationOperationKind,
  result: CreditReservationResult,
): ReservationOperationRecord {
  return {
    operationId: input.operationId,
    reservationId: input.reservationId,
    kind,
    requestedCredits: input.credits,
    result: {
      status: result.status,
      reservedCredits: result.reservedCredits,
      settledCredits: result.settledCredits,
      releasedCredits: result.releasedCredits,
      remainingCredits: result.remainingCredits,
      walletBalance: result.walletBalance,
    },
  };
}
