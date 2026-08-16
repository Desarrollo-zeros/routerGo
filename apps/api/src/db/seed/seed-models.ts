import type pg from 'pg';

type Model = { logical_id: string; provider_model_id: string; gateway_id: string; endpoint_id: string; tier: string; price: number; estimate?: number; caps: Record<string, unknown> };

const MODELS: Model[] = [
  // FREE — Zen FREE pool, saldo cero
  { logical_id: 'deepseek-v4-flash-free', provider_model_id: 'deepseek-v4-flash', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, estimate: 1, caps: { context: 32768 } },
  { logical_id: 'mimo-v2.5-free', provider_model_id: 'mimo-v2.5', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, estimate: 1, caps: { context: 32768 } },
  { logical_id: 'laguna-s-2.1-free', provider_model_id: 'laguna-s-2.1', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, caps: { context: 16384 } },
  { logical_id: 'ling-3.0-tiny-free', provider_model_id: 'ling-3.0-tiny', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, caps: { context: 16384 } },
  { logical_id: 'longcat-2.0-free', provider_model_id: 'longcat-2.0', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, caps: { context: 32768 } },
  { logical_id: 'north-mini-code-free', provider_model_id: 'north-mini-code', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, caps: { context: 16384 } },
  { logical_id: 'nemotron-3-ultra-free', provider_model_id: 'nemotron-3-ultra', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, caps: { context: 65536 } },
  { logical_id: 'big-pickle', provider_model_id: 'big-pickle', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-chat', tier: 'FREE', price: 0, caps: { context: 16384 } },
  // STANDARD — Go pool
  { logical_id: 'gpt-5.6-luna', provider_model_id: 'gpt-5.6-luna', gateway_id: 'gw-go', endpoint_id: 'ep-go-responses', tier: 'STANDARD', price: 120, caps: { context: 128000 } },
  { logical_id: 'kimi-k3', provider_model_id: 'kimi-k3', gateway_id: 'gw-go', endpoint_id: 'ep-go-chat', tier: 'STANDARD', price: 150, caps: { context: 128000 } },
  { logical_id: 'glm-5.2', provider_model_id: 'glm-5.2', gateway_id: 'gw-go', endpoint_id: 'ep-go-chat', tier: 'STANDARD', price: 150, caps: { context: 128000 } },
  { logical_id: 'deepseek-4-pro', provider_model_id: 'deepseek-4-pro', gateway_id: 'gw-go', endpoint_id: 'ep-go-chat', tier: 'STANDARD', price: 180, caps: { context: 64000 } },
  { logical_id: 'qwen-3.8-max', provider_model_id: 'qwen-3.8-max', gateway_id: 'gw-go', endpoint_id: 'ep-go-chat', tier: 'STANDARD', price: 200, caps: { context: 32000 } },
  // PREMIUM — Zen paid
  { logical_id: 'claude-sonnet-5', provider_model_id: 'claude-sonnet-5', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-messages', tier: 'PREMIUM', price: 400, caps: { context: 200000 } },
  { logical_id: 'claude-opus-5', provider_model_id: 'claude-opus-5', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-messages', tier: 'PREMIUM', price: 800, caps: { context: 200000 } },
  { logical_id: 'claude-fable-5', provider_model_id: 'claude-fable-5', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-messages', tier: 'PREMIUM', price: 800, caps: { context: 200000 } },
  { logical_id: 'gpt-5.6-terra', provider_model_id: 'gpt-5.6-terra', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-responses', tier: 'PREMIUM', price: 600, caps: { context: 128000 } },
  { logical_id: 'gpt-5.6-sol', provider_model_id: 'gpt-5.6-sol', gateway_id: 'gw-zen', endpoint_id: 'ep-zen-responses', tier: 'PREMIUM', price: 600, caps: { context: 128000 } },
];

export async function seedModels(client: pg.PoolClient): Promise<void> {
  for (const m of MODELS) {
    await client.query(
      `INSERT INTO model_catalog(logical_id, provider_model_id, gateway_id, endpoint_id, tier, credit_price, limits_json, capabilities_json, enabled, manifest_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,1)
       ON CONFLICT (logical_id) DO UPDATE SET provider_model_id=EXCLUDED.provider_model_id, gateway_id=EXCLUDED.gateway_id, endpoint_id=EXCLUDED.endpoint_id, tier=EXCLUDED.tier, credit_price=EXCLUDED.credit_price, limits_json=EXCLUDED.limits_json, capabilities_json=EXCLUDED.capabilities_json, enabled=true, manifest_version=1`,
      [m.logical_id, m.provider_model_id, m.gateway_id, m.endpoint_id, m.tier, m.price, JSON.stringify({ max_output_tokens: 4096 }), JSON.stringify({ ...m.caps, estimated_platform_cost_microusd: m.estimate ?? 1 })],
    );
  }
}
