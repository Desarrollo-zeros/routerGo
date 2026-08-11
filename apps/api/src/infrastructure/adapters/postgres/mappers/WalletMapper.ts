import { Wallet } from '../../../../domain/entities/Wallet';
import { Credits } from '../../../../domain/value-objects/Credits';

export interface WalletRow {
  id: string;
  user_id: string;
  balance: string;
  version: number;
  updated_at: string | Date;
  created_at?: string | Date;
}

export const WalletMapper = {
  toDomain(row: WalletRow): Wallet {
    const ts = row.updated_at ?? new Date();
    return Wallet.create({
      id: row.id,
      userId: row.user_id,
      balance: Credits.of(BigInt(row.balance)),
      version: row.version,
      createdAt: new Date((row.created_at as string | Date) ?? ts),
      updatedAt: new Date(ts),
    });
  },
  toRow(entity: Wallet): WalletRow {
    const p = entity.toProps();
    return { id: p.id, user_id: p.userId, balance: p.balance.toString(), version: p.version, created_at: p.createdAt.toISOString(), updated_at: p.updatedAt.toISOString() };
  },
};
