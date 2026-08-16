import type { Pool } from 'pg';
import type { ApiQuotaLookup, ApiQuotaPolicy, ApiQuotaRepository } from '../../../application/ports/outbound/ApiQuotaRepository';

type QuotaRow = {
  id: string; scope_type: ApiQuotaPolicy['scopeType']; scope_id: string; model_pattern: string | null;
  requests_per_minute: number | null; tokens_per_minute: string | null; credits_per_minute: string | null;
};

export class ApiQuotaPostgresRepository implements ApiQuotaRepository {
  constructor(private readonly pool: Pool) {}

  async findEnabled(input: ApiQuotaLookup): Promise<ApiQuotaPolicy[]> {
    const result = await this.pool.query<QuotaRow>(
      `SELECT id,scope_type,scope_id,model_pattern,requests_per_minute,tokens_per_minute,credits_per_minute
       FROM api_quota_policies
       WHERE enabled=true AND ((scope_type='CLIENT' AND scope_id=$1)
          OR (scope_type='KEY' AND scope_id=$2)
          OR (scope_type='MODEL' AND scope_id=$3))
         AND (model_pattern IS NULL OR model_pattern=$3)
       ORDER BY scope_type,id`,
      [input.clientId, input.keyId, input.model],
    );
    return result.rows.map(toPolicy);
  }
}

function toPolicy(row: QuotaRow): ApiQuotaPolicy {
  return { id: row.id, scopeType: row.scope_type, scopeId: row.scope_id, modelPattern: row.model_pattern, requestsPerMinute: row.requests_per_minute, tokensPerMinute: row.tokens_per_minute === null ? null : BigInt(row.tokens_per_minute), creditsPerMinute: row.credits_per_minute === null ? null : BigInt(row.credits_per_minute) };
}
