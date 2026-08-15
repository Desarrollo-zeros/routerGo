import type { PoolClient } from 'pg';
import type { PrivilegedOperationIdempotency } from '../../../application/ports/outbound/PrivilegedChangeUnitOfWork';

export class AuditOperationIdempotencyAdapter implements PrivilegedOperationIdempotency {
  constructor(private readonly client: PoolClient) {}

  async isCompleted(operationId: string): Promise<boolean> {
    const result = await this.client.query('SELECT 1 FROM audit_logs WHERE id=$1', [operationId]);
    return result.rowCount === 1;
  }
}
