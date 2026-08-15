export class IdentityInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityInvariantError';
  }
}
