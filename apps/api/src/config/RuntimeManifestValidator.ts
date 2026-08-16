import { ManifestSchema, type RuntimeManifest } from './runtime-manifest-schemas.js';

export class RuntimeManifestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeManifestValidationError';
  }
}

export function validateRuntimeManifest(input: RuntimeManifest): RuntimeManifest {
  const manifest = ManifestSchema.parse(input);
  unique(manifest.apiRoutes.map((route) => route.route_key), 'api route key');
  unique(manifest.uiRoutes.map((route) => route.route_key), 'ui route key');
  unique(manifest.uiRoutes.map((route) => route.path), 'ui route path');
  unique(manifest.models.map((model) => model.logical_id), 'model logical id');
  validateNavigation(manifest);
  validateReferences(manifest);
  return manifest;
}

function validateNavigation(manifest: RuntimeManifest): void {
  const routeKeys = new Set(manifest.uiRoutes.map((route) => route.route_key));
  const screenByRoute = new Map(manifest.uiRoutes.map((route) => [route.route_key, route.screen_key]));
  const flags = new Set(manifest.flags.map((flag) => flag.key));
  for (const item of manifest.uiNavigation) {
    if (!routeKeys.has(item.route_key)) fail(`navigation references unknown UI route: ${item.route_key}`);
    if (screenByRoute.get(item.route_key) !== item.screen_key) fail(`navigation screen mismatch: ${item.route_key}`);
    if (item.feature_flag && !flags.has(item.feature_flag)) fail(`navigation references unknown flag: ${item.feature_flag}`);
  }
}

function validateReferences(manifest: RuntimeManifest): void {
  const gateways = new Set(manifest.gateways.map((gateway) => gateway.id));
  const endpoints = new Set(manifest.endpoints.map((endpoint) => endpoint.id));
  for (const endpoint of manifest.endpoints) if (!gateways.has(endpoint.gateway_id)) fail(`endpoint gateway missing: ${endpoint.id}`);
  for (const model of manifest.models) {
    if (!gateways.has(model.gateway_id)) fail(`model gateway missing: ${model.logical_id}`);
    if (!endpoints.has(model.endpoint_id)) fail(`model endpoint missing: ${model.logical_id}`);
  }
  for (const policy of manifest.poolPolicies) if (!gateways.has(policy.gateway_id)) fail(`pool gateway missing: ${policy.gateway_id}`);
}

function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) fail(`duplicate ${label}`);
}

function fail(message: string): never {
  throw new RuntimeManifestValidationError(message);
}
