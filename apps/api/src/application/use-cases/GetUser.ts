import type { GetUserPort } from '../ports/inbound/IdentityQueries';
import type { UserRepository } from '../ports/outbound/UserRepository';
import { IdentityError } from '../errors/IdentityError';
import type { User } from '../../domain/entities/User';

export class GetUserUseCase implements GetUserPort {
  constructor(private readonly users: UserRepository) {}

  async execute(input: { userId: string }): Promise<User> {
    if (!input.userId.trim()) throw new IdentityError('INVALID_IDENTITY_INPUT');
    const user = await this.users.findById(input.userId);
    if (!user) throw new IdentityError('USER_NOT_FOUND');
    return user;
  }
}
