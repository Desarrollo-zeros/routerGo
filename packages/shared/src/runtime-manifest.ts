export type WebHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type WebTokenType = "color" | "dimension" | "fontFamily" | "fontWeight" | "duration" | "shadow" | "other";
export type WebTier = "FREE" | "STANDARD" | "PREMIUM";

export type WebManifestRoute = {
  route_key: string;
  method: WebHttpMethod;
  path_template: string;
  version: string;
  use_case_key: string;
  auth_policy_key: string;
  request_schema_key: string | null;
  response_schema_key: string | null;
  enabled: boolean;
};

export type WebUiRoute = { route_key: string; path: string; screen_key: string; enabled: boolean };
export type WebNavigationItem = {
  route_key: string;
  screen_key: string;
  label_key: string;
  icon_key: string | null;
  order_index: number;
  required_capability: string | null;
  feature_flag: string | null;
  enabled: boolean;
};
export type WebCatalogEntry = {
  logical_id: string;
  provider_model_id: string;
  gateway_id: string;
  tier: WebTier;
  credit_price: number;
  enabled: boolean;
  capabilities: Record<string, unknown>;
  limits: Record<string, unknown>;
};
export type WebDesignToken = {
  theme: string;
  token_key: string;
  token_type: WebTokenType;
  token_value: string;
  contrast_pair: string | null;
  mode: "light" | "dark";
  enabled: boolean;
};
export type WebRuntimeManifest = {
  version: number;
  contentHash: string;
  apiRoutes: WebManifestRoute[];
  ui: { routes: WebUiRoute[]; navigation: WebNavigationItem[] };
  catalog: WebCatalogEntry[];
  tokens: WebDesignToken[];
  featureFlags: Record<string, boolean>;
};

export class WebManifestValidationError extends Error {
  constructor(message = "Runtime configuration is invalid") {
    super(message);
    this.name = "WebManifestValidationError";
  }
}

export function parseWebRuntimeManifest(input: unknown): WebRuntimeManifest {
  if (!isManifest(input)) throw new WebManifestValidationError();
  return input;
}

function isManifest(value: unknown): value is WebRuntimeManifest {
  if (!record(value) || !positiveInteger(value.version) || !hash(value.contentHash)) return false;
  if (!record(value.ui) || !arrayOf(value.apiRoutes, isApiRoute) || !arrayOf(value.ui.routes, isUiRoute)) return false;
  if (!arrayOf(value.ui.navigation, isNavigation) || !arrayOf(value.catalog, isCatalog) || !arrayOf(value.tokens, isToken)) return false;
  if (!booleanRecord(value.featureFlags) || !unique(value.apiRoutes, (item) => item.route_key)) return false;
  if (!unique(value.ui.routes, (item) => item.route_key) || !unique(value.ui.navigation, (item) => item.route_key)) return false;
  const routeKeys = new Set(value.ui.routes.map((item) => item.route_key));
  return value.ui.navigation.every((item) => routeKeys.has(item.route_key));
}

function isApiRoute(value: unknown): value is WebManifestRoute {
  return record(value) && string(value.route_key) && method(value.method) && string(value.path_template)
    && string(value.version) && string(value.use_case_key) && string(value.auth_policy_key)
    && nullableString(value.request_schema_key) && nullableString(value.response_schema_key) && boolean(value.enabled);
}

function isUiRoute(value: unknown): value is WebUiRoute { return record(value) && string(value.route_key) && path(value.path) && string(value.screen_key) && boolean(value.enabled); }
function isNavigation(value: unknown): value is WebNavigationItem {
  return record(value) && string(value.route_key) && string(value.screen_key) && string(value.label_key)
    && nullableString(value.icon_key) && integer(value.order_index) && nullableString(value.required_capability)
    && nullableString(value.feature_flag) && boolean(value.enabled);
}
function isCatalog(value: unknown): value is WebCatalogEntry {
  return record(value) && string(value.logical_id) && string(value.provider_model_id) && string(value.gateway_id)
    && tier(value.tier) && nonNegative(value.credit_price) && boolean(value.enabled) && record(value.capabilities) && record(value.limits);
}
function isToken(value: unknown): value is WebDesignToken {
  return record(value) && string(value.theme) && string(value.token_key) && tokenType(value.token_type)
    && string(value.token_value) && nullableString(value.contrast_pair) && mode(value.mode) && boolean(value.enabled);
}

function arrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] { return Array.isArray(value) && value.every(guard); }
function unique<T>(items: T[], key: (item: T) => string): boolean { return new Set(items.map(key)).size === items.length; }
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function booleanRecord(value: unknown): value is Record<string, boolean> { return record(value) && Object.values(value).every(boolean); }
function string(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function nullableString(value: unknown): value is string | null { return value === null || string(value); }
function boolean(value: unknown): value is boolean { return typeof value === "boolean"; }
function integer(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value); }
function positiveInteger(value: unknown): value is number { return integer(value) && value > 0; }
function nonNegative(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0; }
function hash(value: unknown): value is string { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value); }
function path(value: unknown): value is string { return string(value) && value.startsWith("/") && !/[?#]/.test(value); }
function method(value: unknown): value is WebHttpMethod { return string(value) && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(value); }
function tier(value: unknown): value is WebTier { return string(value) && ["FREE", "STANDARD", "PREMIUM"].includes(value); }
function tokenType(value: unknown): value is WebTokenType { return string(value) && ["color", "dimension", "fontFamily", "fontWeight", "duration", "shadow", "other"].includes(value); }
function mode(value: unknown): value is "light" | "dark" { return value === "light" || value === "dark"; }
