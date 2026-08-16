import { z } from 'zod';

export const GatewaySchema = z.object({
  id: z.string(), key: z.string(), display_name: z.string(),
  kind: z.enum(['ZEN', 'GO', 'ZEN_FREE', 'ZEN_PAID']), auth_scheme: z.string(),
  enabled: z.boolean(), manifest_version: z.coerce.number().int(),
});

export const EndpointSchema = z.object({
  id: z.string(), gateway_id: z.string(),
  protocol: z.enum(['responses', 'messages', 'chat_completions']),
  base_url: z.string().url(), path_template: z.string(),
  request_mapper_key: z.string(), response_mapper_key: z.string(), enabled: z.boolean(),
});

export const ModelSchema = z.object({
  logical_id: z.string(), provider_model_id: z.string(), gateway_id: z.string(), endpoint_id: z.string(),
  tier: z.enum(['FREE', 'STANDARD', 'PREMIUM']), credit_price: z.coerce.number().int().nonnegative(),
  limits_json: z.record(z.unknown()), capabilities_json: z.record(z.unknown()),
  enabled: z.boolean(), manifest_version: z.coerce.number().int(),
});

export const ApiRouteSchema = z.object({
  route_key: z.string(), method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path_template: z.string(), version: z.string(), use_case_key: z.string(), auth_policy_key: z.string(),
  request_schema_key: z.string().nullable(), response_schema_key: z.string().nullable(),
  enabled: z.boolean(), manifest_version: z.coerce.number().int(),
});

export const UiRouteSchema = z.object({
  route_key: z.string(), path: z.string(), screen_key: z.string(), enabled: z.boolean(),
});

export const NavigationSchema = z.object({
  route_key: z.string(), screen_key: z.string(), label_key: z.string(), icon_key: z.string().nullable(),
  order_index: z.coerce.number().int(), required_capability: z.string().nullable(),
  feature_flag: z.string().nullable(), enabled: z.boolean(), manifest_version: z.coerce.number().int(),
});

export const TokenSchema = z.object({
  theme: z.string(), token_key: z.string(),
  token_type: z.enum(['color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'shadow', 'other']),
  token_value: z.string(), contrast_pair: z.string().nullable(), mode: z.enum(['light', 'dark']),
  version: z.coerce.number().int(), enabled: z.boolean(),
});

export const FlagSchema = z.object({
  key: z.string(), default_value: z.boolean(), rollout_json: z.record(z.unknown()), enabled: z.boolean(),
});

export const PoolPolicySchema = z.object({
  gateway_id: z.string(), pool_kind: z.enum(['ZEN_FREE', 'GO', 'ZEN_PAID']),
  min_active_deployments: z.coerce.number().int().nonnegative(),
  max_window_pct: z.coerce.number().int().min(1).max(100), enabled: z.boolean(),
});

export const ManifestSchema = z.object({
  version: z.number().int().positive(), contentHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  apiRoutes: z.array(ApiRouteSchema), uiRoutes: z.array(UiRouteSchema), uiNavigation: z.array(NavigationSchema),
  gateways: z.array(GatewaySchema), endpoints: z.array(EndpointSchema), models: z.array(ModelSchema),
  tokens: z.array(TokenSchema), flags: z.array(FlagSchema), poolPolicies: z.array(PoolPolicySchema),
  routes: z.array(ApiRouteSchema), navigation: z.array(NavigationSchema),
});

export type RuntimeManifest = z.infer<typeof ManifestSchema>;
export type RuntimeManifestSource = Omit<RuntimeManifest, 'version' | 'contentHash' | 'routes' | 'navigation'>;
