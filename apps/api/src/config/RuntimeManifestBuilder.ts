import { createHash } from 'node:crypto';
import { ManifestSchema, type RuntimeManifest, type RuntimeManifestSource } from './runtime-manifest-schemas.js';
import { validateRuntimeManifest } from './RuntimeManifestValidator.js';

export function buildRuntimeManifest(version: number, source: RuntimeManifestSource): RuntimeManifest {
  const payload = {
    version,
    ...source,
    routes: source.apiRoutes,
    navigation: source.uiNavigation,
  };
  const manifest = ManifestSchema.parse(payload);
  validateRuntimeManifest(manifest);
  return { ...manifest, contentHash: hashManifest(manifest) };
}

export function hashManifest(manifest: RuntimeManifest): string {
  const payload = { ...manifest, contentHash: undefined };
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
