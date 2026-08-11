import { z } from 'zod';

export type JsonSchema = Record<string, unknown>;

export class SchemaRegistry {
  private readonly schemas = new Map<string, JsonSchema>();

  register(key: string, schema: JsonSchema): void {
    this.schemas.set(key, schema);
  }

  registerZod(key: string, schema: z.ZodTypeAny): void {
    this.schemas.set(key, zodToJsonSchema(schema));
  }

  get(key: string): JsonSchema | undefined {
    return this.schemas.get(key);
  }

  require(key: string): JsonSchema {
    const s = this.schemas.get(key);
    if (!s) throw new Error(`Schema not found: ${key}`);
    return s;
  }

  has(key: string): boolean {
    return this.schemas.has(key);
  }

  keys(): string[] {
    return [...this.schemas.keys()];
  }
}

export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const def = (schema as unknown as Record<string, unknown>)._def as Record<string, unknown>;
  const typeName = def.typeName as string | undefined;
  if (!typeName) return { type: 'string' };
  return mapType(schema, typeName);
}

function mapType(schema: z.ZodTypeAny, typeName: string): JsonSchema {
  const prim = mapPrimitiveType(typeName);
  if (prim) return prim;
  const comp = mapCompositeType(schema, typeName);
  if (comp) return comp;
  const wrapped = mapWrappedType(schema, typeName);
  if (wrapped) return wrapped;
  return { type: 'string' };
}

function mapPrimitiveType(typeName: string): JsonSchema | undefined {
  if (typeName === 'ZodString') return { type: 'string' };
  if (typeName === 'ZodNumber') return { type: 'number' };
  if (typeName === 'ZodBoolean') return { type: 'boolean' };
  return undefined;
}

function mapCompositeType(schema: z.ZodTypeAny, typeName: string): JsonSchema | undefined {
  if (typeName === 'ZodEnum') return mapEnumType(schema);
  if (typeName === 'ZodArray') return { type: 'array', items: { type: 'string' } };
  if (typeName === 'ZodObject') return zodObjectToJson(schema);
  return undefined;
}

function mapEnumType(schema: z.ZodTypeAny): JsonSchema {
  const vals = (schema as unknown as Record<string, unknown>)._def as Record<string, unknown>;
  return { type: 'string', enum: vals.values as string[] };
}

function mapWrappedType(schema: z.ZodTypeAny, typeName: string): JsonSchema | undefined {
  if (typeName === 'ZodOptional' || typeName === 'ZodNullable') return unwrap(schema);
  if (typeName === 'ZodDefault') return unwrap(schema);
  if (typeName === 'ZodEffects') return unwrap(schema);
  return undefined;
}

function unwrap(schema: z.ZodTypeAny): JsonSchema {
  const inner = ((schema as unknown as Record<string, unknown>)._def as Record<string, unknown>).innerType as z.ZodTypeAny;
  if (inner) return zodToJsonSchema(inner);
  const sch = ((schema as unknown as Record<string, unknown>)._def as Record<string, unknown>).schema as z.ZodTypeAny;
  if (sch) return zodToJsonSchema(sch);
  return { type: 'string' };
}

function zodObjectToJson(schema: z.ZodTypeAny): JsonSchema {
  const def = (schema as unknown as Record<string, unknown>)._def as Record<string, unknown>;
  const shapeFn = def.shape as (() => Record<string, z.ZodTypeAny>) | undefined;
  const shape = shapeFn ? shapeFn() : (def.shape as Record<string, z.ZodTypeAny>) ?? {};
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const [k, v] of Object.entries(shape)) {
    properties[k] = zodToJsonSchema(v);
    if (!isOptional(v)) required.push(k);
  }
  return { type: 'object', properties, required: required.length ? required : undefined, additionalProperties: false };
}

function isOptional(schema: z.ZodTypeAny): boolean {
  const tn = ((schema as unknown as Record<string, unknown>)._def as Record<string, unknown>).typeName as string;
  return tn === 'ZodOptional' || tn === 'ZodDefault';
}
