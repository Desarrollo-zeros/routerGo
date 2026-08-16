import type { CreditReservation } from '../../../domain/economy/reservation/CreditReservation';

export interface CreditReservationRepository {
  findById(id: string): Promise<CreditReservation | null>;
  findByIdForUpdate(id: string): Promise<CreditReservation | null>;
  findByOperationId(operationId: string): Promise<CreditReservation | null>;
  insert(reservation: CreditReservation): Promise<void>;
  update(reservation: CreditReservation): Promise<void>;
}
