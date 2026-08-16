export const ECONOMY_OPERATION_ERROR_CODES = [
  'INVALID_INPUT',
  'WALLET_NOT_FOUND',
  'INSUFFICIENT_CREDITS',
  'RESERVATION_NOT_FOUND',
  'INVALID_RESERVATION_STATE',
  'DUPLICATE_OPERATION',
  'IDEMPOTENCY_CONFLICT',
  'SETTLEMENT_EXCEEDS_REMAINING',
  'RELEASE_EXCEEDS_REMAINING',
  'TRANSACTION_FAILED',
] as const;

export type EconomyOperationErrorCode = typeof ECONOMY_OPERATION_ERROR_CODES[number];

export class EconomyOperationError extends Error {
  constructor(
    readonly code: EconomyOperationErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'EconomyOperationError';
  }
}
