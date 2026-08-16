import type { Pool } from 'pg';
import type { ExecutionTargetPort, ExecutionTarget } from '../../../application/ports/outbound/ExecutionTargetPort.js';

type Row = {
  gateway_id: string;
  provider_model_id: string;
  endpoint_id: string;
  base_url: string;
  path_template: string;
  request_mapper_key: string;
  response_mapper_key: string;
  endpoint_enabled: boolean;
  gateway_enabled: boolean;
};

export class PostgresExecutionTargetAdapter implements ExecutionTargetPort {
  constructor(private readonly pool: Pool) {}

  async resolve(logicalModelId: string): Promise<ExecutionTarget | null> {
    const result = await this.pool.query<Row>(
      `SELECT m.gateway_id, m.provider_model_id, e.id AS endpoint_id,
              e.base_url, e.path_template, e.request_mapper_key,
              e.response_mapper_key, e.enabled AS endpoint_enabled,
              g.enabled AS gateway_enabled
       FROM model_catalog m
       JOIN provider_endpoints e ON e.id = m.endpoint_id
       JOIN provider_gateways g ON g.id = m.gateway_id
       WHERE m.logical_id=$1 AND m.enabled=true`,
      [logicalModelId],
    );
    const row = result.rows[0];
    if (!row || !row.endpoint_enabled || !row.gateway_enabled) return null;
    return {
      gatewayId: row.gateway_id,
      providerModelId: row.provider_model_id,
      endpoint: {
        baseUrl: row.base_url,
        pathTemplate: row.path_template,
        strategyKey: row.request_mapper_key || row.response_mapper_key,
      },
    };
  }
}
