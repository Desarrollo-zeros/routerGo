import type { Pool, PoolClient } from 'pg';
import type { UnitOfWork, UnitOfWorkFactory } from '../../../application/ports/outbound/UnitOfWork';
import { WalletPostgresRepository } from './WalletPostgresRepository';
import { LedgerPostgresRepository } from './LedgerPostgresRepository';
import { QuotePostgresRepository } from './QuotePostgresRepository';
import { RunPostgresRepository } from './RunPostgresRepository';
import { OutboxPostgresAdapter } from './OutboxPostgresAdapter';

class PgUnitOfWork implements UnitOfWork {
  wallets: WalletPostgresRepository;
  ledgers: LedgerPostgresRepository;
  quotes: QuotePostgresRepository;
  runs: RunPostgresRepository;
  events: OutboxPostgresAdapter;

  constructor(
    private readonly client: PoolClient,
    private readonly pool: Pool,
  ) {
    // Use client-bound pools via adapter that wraps client.query
    const clientPool = { query: (t: string, p?: unknown[]) => client.query(t, p) } as unknown as Pool;
    this.wallets = new WalletPostgresRepository(clientPool);
    this.ledgers = new LedgerPostgresRepository(clientPool);
    this.quotes = new QuotePostgresRepository(clientPool);
    this.runs = new RunPostgresRepository(clientPool);
    this.events = new OutboxPostgresAdapter(clientPool);
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }
}

export class PgUnitOfWorkFactory implements UnitOfWorkFactory {
  constructor(private readonly pool: Pool) {}

  async start(): Promise<UnitOfWork> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return new PgUnitOfWork(client, this.pool);
  }

  async withTransaction<T>(fn: (uow: UnitOfWork) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const uow = new PgUnitOfWork(client, this.pool);
      const result = await fn(uow);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
