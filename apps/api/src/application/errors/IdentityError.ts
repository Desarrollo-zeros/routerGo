export type IdentityErrorCode =
  | 'INVALID_IDENTITY_INPUT'
  | 'USER_NOT_FOUND'
  | 'ORGANIZATION_NOT_FOUND'
  | 'MEMBERSHIP_NOT_FOUND'
  | 'USER_INACTIVE'
  | 'ORGANIZATION_INACTIVE'
  | 'MEMBERSHIP_INACTIVE';

export class IdentityError extends Error {
  constructor(readonly code: IdentityErrorCode) {
    super(code);
    this.name = 'IdentityError';
  }
}
