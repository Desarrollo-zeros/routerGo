import type { User } from '../../../domain/entities/User';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
}
