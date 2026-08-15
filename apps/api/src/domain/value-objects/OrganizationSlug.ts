import { IdentityInvariantError } from '../errors/IdentityInvariantError';

export class OrganizationSlug {
  private constructor(readonly value: string) {}

  static create(value: string): OrganizationSlug {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) || normalized.length > 80) {
      throw new IdentityInvariantError('Invalid organization slug');
    }
    return new OrganizationSlug(normalized);
  }

  equals(other: OrganizationSlug): boolean {
    return this.value === other.value;
  }
}
