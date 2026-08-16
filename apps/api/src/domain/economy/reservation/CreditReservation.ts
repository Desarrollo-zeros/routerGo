import { CreditReservationError } from './CreditReservationError.js';
import { Credits } from '../../value-objects/Credits.js';
export const RESERVATION_STATUSES = ['RESERVED', 'SETTLED', 'RELEASED', 'EXPIRED', 'CANCELLED'] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];
type CreditInput = bigint | Credits;

export interface CreditReservationCreateInput {
  reservationId: string;
  walletId: string;
  operationId: string;
  reservedCredits: bigint;
  createdAt: Date;
  expiresAt?: Date;
}

export interface CreditReservationSnapshot extends CreditReservationCreateInput {
  settledCredits: bigint;
  releasedCredits: bigint;
  status: ReservationStatus;
}

interface ReservationState {
  reservationId: string;
  walletId: string;
  operationId: string;
  reserved: Credits;
  settled: Credits;
  released: Credits;
  status: ReservationStatus;
  createdAt: Date;
  expiresAt?: Date;
}

export class CreditReservation {
  private constructor(private readonly state: ReservationState) {}

  static create(input: CreditReservationCreateInput): CreditReservation {
    validateIdentifiers(input);
    const reserved = positiveCredits(input.reservedCredits);
    return new CreditReservation({
      reservationId: input.reservationId, walletId: input.walletId, operationId: input.operationId, reserved,
      settled: nonNegativeCredits(0n), released: nonNegativeCredits(0n), status: 'RESERVED',
      createdAt: cloneDate(input.createdAt), expiresAt: cloneOptionalDate(input.expiresAt),
    });
  }

  static rehydrate(input: CreditReservationSnapshot): CreditReservation {
    validateIdentifiers(input);
    if (!RESERVATION_STATUSES.includes(input.status)) {
      throw invalidReservation('Unknown reservation status');
    }
    const reservation = new CreditReservation({
      reservationId: input.reservationId, walletId: input.walletId, operationId: input.operationId,
      reserved: positiveCredits(input.reservedCredits), settled: nonNegativeCredits(input.settledCredits),
      released: nonNegativeCredits(input.releasedCredits), status: input.status,
      createdAt: cloneDate(input.createdAt), expiresAt: cloneOptionalDate(input.expiresAt),
    });
    reservation.assertState();
    return reservation;
  }

  get reservationId(): string { return this.state.reservationId; }
  get walletId(): string { return this.state.walletId; }
  get operationId(): string { return this.state.operationId; }
  get reservedCredits(): Credits { return this.state.reserved; }
  get settledCredits(): Credits { return this.state.settled; }
  get releasedCredits(): Credits { return this.state.released; }
  get status(): ReservationStatus { return this.state.status; }
  get createdAt(): Date { return cloneDate(this.state.createdAt); }
  get expiresAt(): Date | undefined { return cloneOptionalDate(this.state.expiresAt); }

  get remainingCredits(): Credits {
    return this.state.reserved.subtract(this.state.settled).subtract(this.state.released);
  }

  settle(amount: CreditInput): void {
    this.assertStatus('RESERVED');
    const credits = normalizeAmount(amount, 'INVALID_SETTLEMENT', 'Settlement must be positive');
    this.assertWithinRemaining(credits, 'INVALID_SETTLEMENT');
    this.state.settled = this.state.settled.add(credits);
    if (this.remainingCredits.isZero()) this.state.status = this.state.released.isZero() ? 'SETTLED' : 'RELEASED';
  }

  release(amount: CreditInput): void {
    if (this.state.status !== 'RESERVED' && this.state.status !== 'EXPIRED') {
      throw invalidTransition('Only reserved or expired reservations can release credits');
    }
    const credits = normalizeAmount(amount, 'INVALID_RELEASE', 'Release must be positive');
    this.assertWithinRemaining(credits, 'INVALID_RELEASE');
    this.state.released = this.state.released.add(credits);
    if (this.remainingCredits.isZero()) this.state.status = 'RELEASED';
  }

  expire(now: Date): void {
    this.assertStatus('RESERVED');
    if (!this.state.expiresAt || now < this.state.expiresAt) {
      throw new CreditReservationError('EXPIRATION_NOT_REACHED', 'Reservation expiration has not been reached');
    }
    this.state.status = 'EXPIRED';
  }

  cancel(): void {
    this.assertStatus('RESERVED');
    if (!this.state.settled.isZero() || !this.state.released.isZero()) {
      throw invalidTransition('A reservation with activity cannot be cancelled');
    }
    this.state.status = 'CANCELLED';
  }

  toSnapshot(): CreditReservationSnapshot {
    return {
      reservationId: this.reservationId,
      walletId: this.walletId,
      operationId: this.operationId,
      reservedCredits: this.reservedCredits.value,
      settledCredits: this.settledCredits.value,
      releasedCredits: this.releasedCredits.value,
      status: this.status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    };
  }

  private assertWithinRemaining(amount: Credits, code: 'INVALID_SETTLEMENT' | 'INVALID_RELEASE'): void {
    if (amount.gt(this.remainingCredits)) {
      throw new CreditReservationError(code, 'Amount exceeds remaining reserved credits');
    }
  }

  private assertStatus(status: ReservationStatus): void {
    if (this.state.status !== status) {
      throw invalidTransition(`Reservation cannot transition from ${this.state.status}`);
    }
  }

  private assertState(): void {
    if (this.state.settled.gt(this.state.reserved) || this.state.released.gt(this.state.reserved)
      || this.state.settled.add(this.state.released).gt(this.state.reserved)) {
      throw invalidReservation('Settlement and release exceed reserved credits');
    }
    if (!this.isStatusStateValid()) throw invalidReservation(`Impossible state for ${this.state.status}`);
  }

  private isStatusStateValid(): boolean {
    switch (this.state.status) {
      case 'RESERVED': return !this.remainingCredits.isZero();
      case 'SETTLED': return this.state.settled.value === this.state.reserved.value && this.state.released.isZero();
      case 'RELEASED': return this.remainingCredits.isZero() && !this.state.released.isZero();
      case 'EXPIRED': return !this.remainingCredits.isZero();
      case 'CANCELLED': return this.state.settled.isZero() && this.state.released.isZero();
    }
  }
}

function validateIdentifiers(input: CreditReservationCreateInput): void {
  if (![input.reservationId, input.walletId, input.operationId].every((value) => value.trim().length > 0)) {
    throw invalidReservation('Reservation identifiers are required');
  }
}

function normalizeAmount(amount: CreditInput, code: 'INVALID_SETTLEMENT' | 'INVALID_RELEASE', message: string): Credits {
  try {
    const credits = amount instanceof Credits ? amount : Credits.of(amount);
    if (credits.isNegative()) throw new CreditReservationError(code, message);
    if (credits.isZero()) throw new CreditReservationError(code, message);
    return credits;
  } catch (error) {
    if (error instanceof CreditReservationError && error.code === code) throw error;
    throw new CreditReservationError(code, message);
  }
}

function nonNegativeCredits(value: bigint): Credits {
  const credits = Credits.of(value);
  if (credits.isNegative()) throw invalidReservation('Credits cannot be negative');
  return credits;
}

function positiveCredits(value: bigint): Credits {
  const credits = nonNegativeCredits(value);
  if (credits.isZero()) throw invalidReservation('Reserved credits must be positive');
  return credits;
}

function invalidReservation(message: string): CreditReservationError {
  return new CreditReservationError('INVALID_RESERVATION', message);
}

function invalidTransition(message: string): CreditReservationError {
  return new CreditReservationError('INVALID_TRANSITION', message);
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

function cloneOptionalDate(date?: Date): Date | undefined {
  return date ? cloneDate(date) : undefined;
}
