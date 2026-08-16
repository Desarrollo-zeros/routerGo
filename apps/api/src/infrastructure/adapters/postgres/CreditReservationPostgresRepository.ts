import type { Pool } from 'pg';
import type { CreditReservationRepository } from '../../../application/ports/outbound/CreditReservationRepository';
import type { CreditReservation } from '../../../domain/economy/reservation/CreditReservation';
import { CreditReservationMapper, type CreditReservationRow } from './mappers/CreditReservationMapper';

export class CreditReservationPostgresRepository implements CreditReservationRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<CreditReservation | null> {
    return this.find('WHERE id=$1', [id]);
  }

  async findByIdForUpdate(id: string): Promise<CreditReservation | null> {
    return this.find('WHERE id=$1 FOR UPDATE', [id]);
  }

  async findByOperationId(operationId: string): Promise<CreditReservation | null> {
    return this.find('WHERE operation_id=$1', [operationId]);
  }

  async insert(reservation: CreditReservation): Promise<void> {
    const s = reservation.toSnapshot();
    await this.pool.query(
      `INSERT INTO credit_reservations
       (id,wallet_id,operation_id,reserved_credits,settled_credits,released_credits,status,expires_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [s.reservationId, s.walletId, s.operationId, s.reservedCredits.toString(), s.settledCredits.toString(), s.releasedCredits.toString(), s.status, s.expiresAt ?? null, s.createdAt],
    );
  }

  async update(reservation: CreditReservation): Promise<void> {
    const s = reservation.toSnapshot();
    const result = await this.pool.query(
      `UPDATE credit_reservations
       SET settled_credits=$2, released_credits=$3, status=$4, updated_at=now(),
           settled_at=CASE WHEN $4='SETTLED' THEN COALESCE(settled_at,now()) ELSE settled_at END,
           released_at=CASE WHEN $4='RELEASED' THEN COALESCE(released_at,now()) ELSE released_at END
       WHERE id=$1`,
      [s.reservationId, s.settledCredits.toString(), s.releasedCredits.toString(), s.status],
    );
    if (result.rowCount !== 1) throw new Error('ReservationUpdateFailed');
  }

  private async find(where: string, params: string[]): Promise<CreditReservation | null> {
    const result = await this.pool.query<CreditReservationRow>(
      `SELECT id,wallet_id,operation_id,reserved_credits,settled_credits,released_credits,status,expires_at,created_at
       FROM credit_reservations ${where}`,
      params,
    );
    return result.rows[0] ? CreditReservationMapper.toDomain(result.rows[0]) : null;
  }
}
