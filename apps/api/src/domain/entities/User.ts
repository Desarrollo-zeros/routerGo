import { IdentityInvariantError } from '../errors/IdentityInvariantError';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export interface UserProps { id: string; status: UserStatus }

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    if (!props.id.trim()) throw new IdentityInvariantError('User id is required');
    return new User({ ...props });
  }

  get id(): string { return this.props.id; }
  get status(): UserStatus { return this.props.status; }
  isActive(): boolean { return this.status === 'ACTIVE'; }
  toProps(): UserProps { return { ...this.props }; }
}
