import { bootstrapRuntime } from "../runtime/bootstrap";
import type { RuntimeBundle } from "../runtime/bootstrap";

let bundle: RuntimeBundle | null = null;

export async function initApp(forceRefresh = false): Promise<RuntimeBundle> {
  if (bundle && !forceRefresh) return bundle;
  bundle = await bootstrapRuntime();
  return bundle;
}

export function getBundle(): RuntimeBundle | null {
  return bundle;
}
