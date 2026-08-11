import type { Wallet } from '../../../domain/entities/Wallet';

export interface WalletRepository {
  findById(id: string): Promise<Wallet | null>;
  findByUserId(userId: string): Promise<Wallet | null>;
  findByIdForUpdate(id: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
  createForUser(userId: string): Promise<Wallet>;
}
