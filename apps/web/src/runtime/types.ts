export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type TokenType = "color" | "dimension" | "fontFamily" | "fontWeight" | "duration" | "shadow" | "other";

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
  token_type: TokenType;
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
  required_capability: string | null;
  feature_flag: string | null;
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

export class ManifestValidationError extends Error {
  constructor(message = "Runtime configuration is invalid") {
    super(message);
    this.name = "ManifestValidationError";
  }
}

export function parseRuntimeManifest(input: unknown): RuntimeManifest {
  if (!isRuntimeManifest(input)) throw new ManifestValidationError();
  return input;
}

function isRuntimeManifest(value: unknown): value is RuntimeManifest {
  if (!isRecord(value) || !isPositiveInteger(value.manifest_version)) return false;
  if (!isArrayOf(value.routes, isManifestRoute) || !isArrayOf(value.catalog, isCatalogEntry)) return false;
  if (!isArrayOf(value.tokens, isDesignToken) || !isArrayOf(value.navigation, isNavItem)) return false;
  if (!isBooleanRecord(value.feature_flags)) return false;
  if (!unique(value.routes, (item) => item.route_key) || !unique(value.navigation, (item) => item.route_key)) return false;
  const routeKeys = new Set(value.routes.map((item) => item.route_key));
  return value.navigation.every((item) => routeKeys.has(item.route_key));
}

function isManifestRoute(value: unknown): value is ManifestRoute {
  if (!isRecord(value)) return false;
  return isString(value.route_key) && isHttpMethod(value.method) && isString(value.path_template)
    && isString(value.version) && isString(value.use_case_key) && isString(value.auth_policy_key)
    && isNullableString(value.request_schema_key) && isNullableString(value.response_schema_key)
    && isBoolean(value.enabled);
}

function isCatalogEntry(value: unknown): value is CatalogEntry {
  if (!isRecord(value)) return false;
  return isString(value.logical_id) && isString(value.provider_model_id) && isString(value.gateway_id)
    && isTier(value.tier) && isNonNegativeNumber(value.credit_price) && isBoolean(value.enabled)
    && isRecord(value.capabilities) && isRecord(value.limits);
}

function isDesignToken(value: unknown): value is DesignToken {
  if (!isRecord(value)) return false;
  return isString(value.theme) && isString(value.token_key) && isTokenType(value.token_type)
    && isString(value.token_value) && isNullableString(value.contrast_pair)
    && isMode(value.mode) && isBoolean(value.enabled);
}

function isNavItem(value: unknown): value is NavItem {
  if (!isRecord(value)) return false;
  return isString(value.route_key) && isString(value.screen_key) && isString(value.label_key)
    && isNullableString(value.icon_key) && isInteger(value.order_index)
    && isNullableString(value.required_capability) && isNullableString(value.feature_flag)
    && isBoolean(value.enabled);
}

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function unique<T>(items: T[], key: (item: T) => string): boolean {
  return new Set(items.map(key)).size === items.length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isRecord(value) && Object.values(value).every(isBoolean);
}

function isString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isNullableString(value: unknown): value is string | null { return value === null || isString(value); }
function isBoolean(value: unknown): value is boolean { return typeof value === "boolean"; }
function isInteger(value: unknown): value is number { return typeof value === "number" && Number.isInteger(value); }
function isPositiveInteger(value: unknown): value is number { return isInteger(value) && value > 0; }
function isNonNegativeNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value >= 0; }
function isHttpMethod(value: unknown): value is HttpMethod { return isString(value) && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(value); }
function isTier(value: unknown): value is CatalogEntry["tier"] { return isString(value) && ["FREE", "STANDARD", "PREMIUM"].includes(value); }
function isTokenType(value: unknown): value is TokenType { return isString(value) && ["color", "dimension", "fontFamily", "fontWeight", "duration", "shadow", "other"].includes(value); }
function isMode(value: unknown): value is DesignToken["mode"] { return value === "light" || value === "dark"; }
