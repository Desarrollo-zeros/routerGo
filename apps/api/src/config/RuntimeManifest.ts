import { z } from 'zod';
import type pg from 'pg';

export const GatewaySchema = z.object({
  id: z.string(),
  key: z.string(),
  display_name: z.string(),
  kind: z.enum(['ZEN', 'GO', 'ZEN_FREE', 'ZEN_PAID']),
  auth_scheme: z.string(),
  enabled: z.boolean(),
  manifest_version: z.coerce.number().int(),
});

export const EndpointSchema = z.object({
  id: z.string(),
  gateway_id: z.string(),
  protocol: z.enum(['responses', 'messages', 'chat_completions']),
  base_url: z.string().url(),
  path_template: z.string(),
  request_mapper_key: z.string(),
  response_mapper_key: z.string(),
  enabled: z.boolean(),
});

export const ModelSchema = z.object({
  logical_id: z.string(),
  provider_model_id: z.string(),
  gateway_id: z.string(),
  endpoint_id: z.string(),
  tier: z.enum(['FREE', 'STANDARD', 'PREMIUM']),
  credit_price: z.coerce.number().int().nonnegative(),
  limits_json: z.record(z.unknown()),
  capabilities_json: z.record(z.unknown()),
  enabled: z.boolean(),
  manifest_version: z.coerce.number().int(),
});

export const RouteSchema = z.object({
  route_key: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path_template: z.string(),
  version: z.string(),
  use_case_key: z.string(),
  auth_policy_key: z.string(),
  request_schema_key: z.string().nullable(),
  response_schema_key: z.string().nullable(),
  enabled: z.boolean(),
  manifest_version: z.coerce.number().int(),
});

export const NavigationSchema = z.object({
  route_key: z.string(),
  screen_key: z.string(),
  label_key: z.string(),
  icon_key: z.string().nullable(),
  order_index: z.coerce.number().int(),
  required_capability: z.string().nullable(),
  feature_flag: z.string().nullable(),
  enabled: z.boolean(),
  manifest_version: z.coerce.number().int(),
});

export const TokenSchema = z.object({
  theme: z.string(),
  token_key: z.string(),
  token_type: z.enum(['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'shadow', 'other']),
  token_value: z.string(),
  contrast_pair: z.string().nullable(),
  mode: z.enum(['light', 'dark']),
  version: z.coerce.number().int(),
  enabled: z.boolean(),
});

export const FlagSchema = z.object({
  key: z.string(),
  default_value: z.boolean(),
  rollout_json: z.record(z.unknown()),
  enabled: z.boolean(),
});

export const PoolPolicySchema = z.object({
  gateway_id: z.string(),
  pool_kind: z.enum(['ZEN_FREE', 'GO', 'ZEN_PAID']),
  min_active_deployments: z.coerce.number().int().nonnegative(),
  max_window_pct: z.coerce.number().int().min(1).max(100),
  enabled: z.boolean(),
});

export const ManifestSchema = z.object({
  version: z.number().int(),
  gateways: z.array(GatewaySchema),
  endpoints: z.array(EndpointSchema),
  models: z.array(ModelSchema),
  routes: z.array(RouteSchema),
  navigation: z.array(NavigationSchema),
  tokens: z.array(TokenSchema),
  flags: z.array(FlagSchema),
  poolPolicies: z.array(PoolPolicySchema),
});

export type RuntimeManifest = z.infer<typeof ManifestSchema>;

async function fetchTable(pool: pg.Pool, sql: string): Promise<Record<string, unknown>[]> {
  const r = await pool.query(sql);
  return r.rows as Record<string, unknown>[];
}

export async function loadRuntimeManifest(pool: pg.Pool): Promise<RuntimeManifest> {
  const [gateways, endpoints, models, routes, navigation, tokens, flags, poolPolicies] =
    await Promise.all([
      fetchTable(pool, 'SELECT * FROM provider_gateways WHERE enabled=true ORDER BY key'),
      fetchTable(pool, 'SELECT * FROM provider_endpoints WHERE enabled=true ORDER BY id'),
      fetchTable(pool, 'SELECT * FROM model_catalog WHERE enabled=true ORDER BY logical_id'),
      fetchTable(pool, 'SELECT * FROM api_routes WHERE enabled=true ORDER BY route_key'),
      fetchTable(pool, 'SELECT * FROM ui_navigation WHERE enabled=true ORDER BY order_index'),
      fetchTable(pool, 'SELECT * FROM design_tokens WHERE enabled=true ORDER BY theme, token_key'),
      fetchTable(pool, 'SELECT * FROM feature_flags WHERE enabled=true ORDER BY key'),
      fetchTable(pool, 'SELECT * FROM pool_policies WHERE enabled=true ORDER BY gateway_id, pool_kind'),
    ]);

  const raw = {
    version: 1,
    gateways,
    endpoints,
    models,
    routes,
    navigation,
    tokens,
    flags,
    poolPolicies,
  };
  return ManifestSchema.parse(raw);
}

export function validateRegistryKeys(manifest: RuntimeManifest, allowedUseCases: string[]): void {
  for (const r of manifest.routes) {
    if (!allowedUseCases.includes(r.use_case_key)) {
      throw new Error(`use_case_key not registered: ${r.use_case_key}`);
    }
  }
}
