import type { Pool } from 'pg';
import type { ApiKeyRecord, ApiKeyRepository } from '../../../application/ports/outbound/ApiKeyRepository';

type ApiKeyRow = {
  id: string;
  client_id: string;
  key_hash: string;
  prefix: string;
  scopes_json: string[];
  status: ApiKeyRecord['status'];
  expires_at: Date | null;
};

export class ApiKeyPostgresRepository implements ApiKeyRepository {
  constructor(private readonly pool: Pool) {}

  async insert(record: ApiKeyRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO api_keys (id,client_id,key_hash,prefix,scopes_json,status,expires_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
      [record.id, record.clientId, record.keyHash, record.prefix, JSON.stringify(record.scopes), record.status, record.expiresAt],
    );
  }

  async findByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const result = await this.pool.query<ApiKeyRow>(`${selectColumns()} WHERE key_hash=$1`, [keyHash]);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }

  async findById(id: string): Promise<ApiKeyRecord | null> {
    const result = await this.pool.query<ApiKeyRow>(`${selectColumns()} WHERE id=$1`, [id]);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.pool.query(`UPDATE api_keys SET status='REVOKED', revoked_at=$2 WHERE id=$1`, [id, revokedAt]);
  }

  async touchLastUsed(id: string, usedAt: Date): Promise<void> {
    await this.pool.query('UPDATE api_keys SET last_used_at=$2 WHERE id=$1', [id, usedAt]);
  }
}

function selectColumns(): string {
  return 'SELECT id,client_id,key_hash,prefix,scopes_json,status,expires_at FROM api_keys';
}

function toRecord(row: ApiKeyRow): ApiKeyRecord {
  return { id: row.id, clientId: row.client_id, keyHash: row.key_hash, prefix: row.prefix, scopes: row.scopes_json, status: row.status, expiresAt: row.expires_at };
}
