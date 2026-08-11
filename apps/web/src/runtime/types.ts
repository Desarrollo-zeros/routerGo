export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ManifestRoute = {
  route_key: string;
  method: HttpMethod;
  path_template: string;
  version: string;
  use_case_key: string;
  auth_policy_key: string;
  request_schema_key: string | null;
  response_schema_key: string | null;
  enabled: boolean;
};
export type CatalogEntry = {
  logical_id: string;
  provider_model_id: string;
  gateway_id: string;
  tier: "FREE" | "STANDARD" | "PREMIUM";
  credit_price: number;
  enabled: boolean;
  capabilities: Record<string, unknown>;
  limits: Record<string, unknown>;
};
export type DesignToken = {
  theme: string;
  token_key: string;
  token_type: string;
  token_value: string;
  contrast_pair: string | null;
  mode: "light" | "dark";
  enabled: boolean;
};
export type NavItem = {
  route_key: string;
  screen_key: string;
  label_key: string;
  icon_key: string | null;
  order_index: number;
  enabled: boolean;
};
export type RuntimeManifest = {
  manifest_version: number;
  routes: ManifestRoute[];
  catalog: CatalogEntry[];
  tokens: DesignToken[];
  navigation: NavItem[];
  feature_flags: Record<string, boolean>;
};
