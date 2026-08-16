import type { ReservationStatus } from '../../../domain/economy/reservation/CreditReservation';

export interface CreditReservationResult {
  reservationId: string;
  status: ReservationStatus;
  reservedCredits: bigint;
  settledCredits: bigint;
  releasedCredits: bigint;
  remainingCredits: bigint;
  walletBalance: bigint;
  reused: boolean;
}

export interface ReserveCreditsInput {
  operationId: string;
  walletId: string;
  credits: bigint;
  reservationId?: string;
  expiresAt?: Date;
}

export interface SettleCreditsInput {
  operationId: string;
  reservationId: string;
  credits: bigint;
}

export interface ReleaseCreditsInput {
  operationId: string;
  reservationId: string;
  credits: bigint;
}

export interface ReserveCreditsPort {
  execute(input: ReserveCreditsInput): Promise<CreditReservationResult>;
}

export interface SettleCreditsPort {
  execute(input: SettleCreditsInput): Promise<CreditReservationResult>;
}

export interface ReleaseCreditsPort {
  execute(input: ReleaseCreditsInput): Promise<CreditReservationResult>;
}
