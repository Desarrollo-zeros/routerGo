import type { Pool } from 'pg';
import type { EconomyReconciliationRepository } from '../../../application/use-cases/ReconcileEconomy';

type RunCandidate = { id: string; request_id: string; cost: string; input_tokens: string; output_tokens: string; model_id: string; gateway_id: string; endpoint_id: string; pricing_version: string };
type RevenueCandidate = { id: string; amount: string; occurred_at: Date };

export class PostgresEconomyReconciliationRepository implements EconomyReconciliationRepository {
  constructor(private readonly pool: Pool) {}

  async reconcileProviderCosts(limit: number): Promise<number> {
    const candidates = await this.providerCandidates(limit);
    let inserted = 0;
    for (const row of candidates) inserted += await this.insertProviderCost(row);
    return inserted;
  }

  async reconcileFinalizedRevenue(limit: number): Promise<number> {
    const candidates = await this.revenueCandidates(limit);
    let inserted = 0;
    for (const row of candidates) inserted += await this.insertRevenue(row);
    return inserted;
  }

  async countReconciliationRequiredRuns(): Promise<number> {
    const result = await this.pool.query<{ count: string }>("SELECT count(*)::text AS count FROM chat_runs WHERE economy_status='RECONCILIATION_REQUIRED'");
    return Number(result.rows[0]?.count ?? '0');
  }

  private async providerCandidates(limit: number): Promise<RunCandidate[]> {
    const result = await this.pool.query<RunCandidate>(
      `SELECT r.id, r.provider_request_id AS request_id, r.provider_cost_microusd AS cost,
              r.input_tokens, r.output_tokens, r.logical_model_id AS model_id,
              m.gateway_id, m.endpoint_id, q.pricing_version
       FROM chat_runs r
       JOIN chat_quotes q ON q.id=r.quote_id
       JOIN model_catalog m ON m.logical_id=r.logical_model_id
       WHERE r.provider_request_id IS NOT NULL AND r.provider_cost_microusd > 0
         AND NOT EXISTS (SELECT 1 FROM provider_cost_entries p WHERE p.run_id=r.id OR p.provider_request_id=r.provider_request_id)
       ORDER BY r.created_at LIMIT $1`, [limit],
    );
    return result.rows;
  }

  private async revenueCandidates(limit: number): Promise<RevenueCandidate[]> {
    const result = await this.pool.query<RevenueCandidate>(
      `SELECT id, finalized_revenue_micro AS amount, occurred_at
       FROM ad_events
       WHERE status='FINALIZED' AND finalized_revenue_micro IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM revenue_entries r WHERE r.operation_id='ad:' || ad_events.id || ':revenue')
       ORDER BY occurred_at LIMIT $1`, [limit],
    );
    return result.rows;
  }

  private async insertProviderCost(row: RunCandidate): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO provider_cost_entries
       (id,operation_id,provider_request_id,run_id,provider_gateway_id,endpoint_id,model_logical_id,input_tokens,output_tokens,cost_microusd,pricing_version,source)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'UPSTREAM_RESULT') ON CONFLICT DO NOTHING`,
      [`run:${row.id}:provider-cost`, row.request_id, row.id, row.gateway_id, row.endpoint_id, row.model_id, row.input_tokens, row.output_tokens, row.cost, row.pricing_version],
    );
    return result.rowCount ?? 0;
  }

  private async insertRevenue(row: RevenueCandidate): Promise<number> {
    const result = await this.pool.query(
      `INSERT INTO revenue_entries
       (id,operation_id,source_type,ad_event_id,gross_revenue_microusd,net_revenue_microusd,status,occurred_at,finalized_at)
       VALUES (gen_random_uuid(),$1,'AD_EVENT',$2,$3,$3,'FINALIZED',$4,now()) ON CONFLICT DO NOTHING`,
      [`ad:${row.id}:revenue`, row.id, row.amount, row.occurred_at],
    );
    return result.rowCount ?? 0;
  }
}
