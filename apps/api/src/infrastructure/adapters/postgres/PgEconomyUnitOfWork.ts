import type { Pool, PoolClient } from 'pg';
import type { EconomyUnitOfWork, EconomyUnitOfWorkFactory } from '../../../application/ports/outbound/EconomyUnitOfWork';
import { WalletPostgresRepository } from './WalletPostgresRepository';
import { LedgerPostgresRepository } from './LedgerPostgresRepository';
import { CreditReservationPostgresRepository } from './CreditReservationPostgresRepository';
import { ReservationOperationPostgresRepository } from './ReservationOperationPostgresRepository';

class PgEconomyUnitOfWork implements EconomyUnitOfWork {
  readonly wallets: WalletPostgresRepository;
  readonly ledgers: LedgerPostgresRepository;
  readonly reservations: CreditReservationPostgresRepository;
  readonly operations: ReservationOperationPostgresRepository;

  constructor(client: PoolClient) {
    const transactionPool = { query: (text: string, params?: unknown[]) => client.query(text, params) } as unknown as Pool;
    this.wallets = new WalletPostgresRepository(transactionPool);
    this.ledgers = new LedgerPostgresRepository(transactionPool);
    this.reservations = new CreditReservationPostgresRepository(transactionPool);
    this.operations = new ReservationOperationPostgresRepository(transactionPool);
  }
}

export class PgEconomyUnitOfWorkFactory implements EconomyUnitOfWorkFactory {
  constructor(private readonly pool: Pool) {}

  async withTransaction<T>(work: (scope: EconomyUnitOfWork) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(new PgEconomyUnitOfWork(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    return;
  }
}
