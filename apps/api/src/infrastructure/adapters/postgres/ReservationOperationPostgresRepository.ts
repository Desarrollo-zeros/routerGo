import type { Pool } from 'pg';
import type {
  ReservationOperationRepository,
  ReservationOperationRecord,
} from '../../../application/ports/outbound/ReservationOperationRepository';
import type { ReservationStatus } from '../../../domain/economy/reservation/CreditReservation';

interface ReservationOperationRow {
  operation_id: string;
  reservation_id: string;
  operation_kind: 'SETTLE' | 'RELEASE';
  requested_credits: string | bigint;
  result_status: ReservationStatus;
  result_reserved_credits: string | bigint;
  result_settled_credits: string | bigint;
  result_released_credits: string | bigint;
  result_remaining_credits: string | bigint;
  result_wallet_balance: string | bigint;
}

export class ReservationOperationPostgresRepository implements ReservationOperationRepository {
  constructor(private readonly pool: Pool) {}

  async findById(operationId: string): Promise<ReservationOperationRecord | null> {
    const result = await this.pool.query<ReservationOperationRow>(
      `SELECT operation_id,reservation_id,operation_kind,requested_credits,result_status,
              result_reserved_credits,result_settled_credits,result_released_credits,
              result_remaining_credits,result_wallet_balance
       FROM credit_reservation_operations WHERE operation_id=$1`,
      [operationId],
    );
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }

  async insert(operation: ReservationOperationRecord): Promise<boolean> {
    const r = operation.result;
    const result = await this.pool.query(
      `INSERT INTO credit_reservation_operations
       (operation_id,reservation_id,operation_kind,requested_credits,result_status,
        result_reserved_credits,result_settled_credits,result_released_credits,
        result_remaining_credits,result_wallet_balance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (operation_id) DO NOTHING`,
      [operation.operationId, operation.reservationId, operation.kind, operation.requestedCredits.toString(), r.status,
        r.reservedCredits.toString(), r.settledCredits.toString(), r.releasedCredits.toString(), r.remainingCredits.toString(), r.walletBalance.toString()],
    );
    return result.rowCount === 1;
  }
}

function toRecord(row: ReservationOperationRow): ReservationOperationRecord {
  return {
    operationId: row.operation_id,
    reservationId: row.reservation_id,
    kind: row.operation_kind,
    requestedCredits: BigInt(row.requested_credits),
    result: {
      status: row.result_status,
      reservedCredits: BigInt(row.result_reserved_credits),
      settledCredits: BigInt(row.result_settled_credits),
      releasedCredits: BigInt(row.result_released_credits),
      remainingCredits: BigInt(row.result_remaining_credits),
      walletBalance: BigInt(row.result_wallet_balance),
    },
  };
}
