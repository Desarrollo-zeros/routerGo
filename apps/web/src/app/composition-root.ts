import { bootstrapRuntime } from "../runtime/bootstrap";
import type { RuntimeBundle } from "../runtime/bootstrap";

let bundle: RuntimeBundle | null = null;

export async function initApp(): Promise<RuntimeBundle> {
  if (bundle) return bundle;
  bundle = await bootstrapRuntime();
  return bundle;
}

export function getBundle(): RuntimeBundle | null {
  return bundle;
}
