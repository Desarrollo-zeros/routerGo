export const CREDIT_RESERVATION_ERROR_CODES = [
  'INVALID_RESERVATION',
  'INVALID_AMOUNT',
  'INVALID_SETTLEMENT',
  'INVALID_RELEASE',
  'INVALID_TRANSITION',
  'EXPIRATION_NOT_REACHED',
] as const;

export type CreditReservationErrorCode = typeof CREDIT_RESERVATION_ERROR_CODES[number];

export class CreditReservationError extends Error {
  constructor(
    readonly code: CreditReservationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CreditReservationError';
  }
}
