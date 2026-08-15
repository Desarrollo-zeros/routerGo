import type { Pool, PoolClient } from 'pg';
import type { PrivilegedChangeScope, PrivilegedChangeUnitOfWork } from '../../../application/ports/outbound/PrivilegedChangeUnitOfWork';
import { AuditLogPostgresAdapter } from './AuditLogPostgresAdapter';
import { AuditOperationIdempotencyAdapter } from './AuditOperationIdempotencyAdapter';
import { PrivilegedOutboxPostgresAdapter } from './PrivilegedOutboxPostgresAdapter';

export type PrivilegedScopeFactory<TScope extends PrivilegedChangeScope> =
  (client: PoolClient, base: PrivilegedChangeScope) => TScope;

export class PgPrivilegedChangeUnitOfWork<TScope extends PrivilegedChangeScope> implements PrivilegedChangeUnitOfWork<TScope> {
  constructor(
    private readonly pool: Pool,
    private readonly scopeFactory: PrivilegedScopeFactory<TScope>,
  ) {}

  async run<TResult>(operationId: string, work: (scope: TScope) => Promise<TResult>): Promise<TResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const scope = this.scopeFactory(client, this.createBaseScope(client));
      const result = await work(scope);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await this.rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private createBaseScope(client: PoolClient): PrivilegedChangeScope {
    return {
      audit: new AuditLogPostgresAdapter(client),
      outbox: new PrivilegedOutboxPostgresAdapter(client),
      idempotency: new AuditOperationIdempotencyAdapter(client),
    };
  }

  private async rollback(client: PoolClient): Promise<void> {
    try {
      await client.query('ROLLBACK');
    } catch {
      return;
    }
  }
}
