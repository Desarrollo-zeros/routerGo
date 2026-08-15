import type { JsonObject, JsonValue } from '../contracts/JsonValue';

const BLOCKED_KEYS = new Set([
  'password', 'passwordhash', 'apikey', 'authorization', 'cookie', 'token', 'providertoken',
  'accesstoken', 'refreshtoken', 'secret', 'credentials', 'rawprompt', 'prompt',
  'preciselocationhistory',
]);

export function sanitizeAuditMetadata(input: JsonObject): JsonObject {
  return sanitizeObject(input);
}

function sanitizeObject(input: JsonObject): JsonObject {
  const output: JsonObject = {};
  for (const [key, value] of Object.entries(input)) {
    if (!BLOCKED_KEYS.has(normalizeKey(key))) output[key] = sanitizeValue(value);
  }
  return output;
}

function sanitizeValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object') return sanitizeObject(value);
  return value;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}
