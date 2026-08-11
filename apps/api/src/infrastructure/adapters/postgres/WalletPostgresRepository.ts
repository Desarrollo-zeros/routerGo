import type { Pool } from 'pg';
import type { WalletRepository } from '../../../application/ports/outbound/WalletRepository';
import { Wallet } from '../../../domain/entities/Wallet';
import { Credits } from '../../../domain/value-objects/Credits';
import { WalletMapper } from './mappers/WalletMapper';

export class WalletPostgresRepository implements WalletRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Wallet | null> {
    const r = await this.pool.query('SELECT * FROM wallets WHERE id=$1', [id]);
    return r.rows[0] ? WalletMapper.toDomain(r.rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    const r = await this.pool.query('SELECT * FROM wallets WHERE user_id=$1 LIMIT 1', [userId]);
    return r.rows[0] ? WalletMapper.toDomain(r.rows[0]) : null;
  }

  async findByIdForUpdate(id: string): Promise<Wallet | null> {
    const r = await this.pool.query('SELECT * FROM wallets WHERE id=$1 FOR UPDATE', [id]);
    return r.rows[0] ? WalletMapper.toDomain(r.rows[0]) : null;
  }

  async save(wallet: Wallet): Promise<void> {
    const p = wallet.toProps();
    await this.pool.query(
      `INSERT INTO wallets (id,user_id,balance,version,updated_at)
       VALUES ($1,$2,$3,$4,now())
       ON CONFLICT (id) DO UPDATE SET balance=EXCLUDED.balance, version=EXCLUDED.version, updated_at=now()`,
      [p.id, p.userId, p.balance.toString(), p.version],
    );
  }

  async createForUser(userId: string): Promise<Wallet> {
    const wallet = Wallet.create({ id: `w_${userId}`, userId, balance: Credits.zero(), version: 1, createdAt: new Date(), updatedAt: new Date() });
    await this.save(wallet);
    return wallet;
  }
}
