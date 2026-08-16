import { CreditReservation, type CreditReservationSnapshot } from '../../../../domain/economy/reservation/CreditReservation';

export interface CreditReservationRow {
  id: string;
  wallet_id: string;
  operation_id: string;
  reserved_credits: string | bigint;
  settled_credits: string | bigint;
  released_credits: string | bigint;
  status: CreditReservationSnapshot['status'];
  expires_at: string | Date | null;
  created_at: string | Date;
  quote_id?: string | null;
  run_id?: string | null;
}

export const CreditReservationMapper = {
  toDomain(row: CreditReservationRow): CreditReservation {
    return CreditReservation.rehydrate({
      reservationId: row.id,
      walletId: row.wallet_id,
      operationId: row.operation_id,
      reservedCredits: BigInt(row.reserved_credits),
      settledCredits: BigInt(row.settled_credits),
      releasedCredits: BigInt(row.released_credits),
      status: row.status,
      createdAt: new Date(row.created_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      quoteId: row.quote_id ?? undefined,
      runId: row.run_id ?? undefined,
    });
  },
};
