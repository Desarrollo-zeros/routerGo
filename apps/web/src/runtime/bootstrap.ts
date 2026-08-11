export type ManifestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; version: number }
  | { status: "error"; message: string };

import type { RuntimeManifest } from "./types";
import { RouteResolver } from "./RouteResolver";
import { CatalogRegistry } from "./CatalogRegistry";
import { DesignTokenRegistry } from "./DesignTokenRegistry";
import { HttpApiPort } from "./ApiPort";

export type RuntimeBundle = {
  manifest: RuntimeManifest;
  routes: RouteResolver;
  catalog: CatalogRegistry;
  tokens: DesignTokenRegistry;
  api: HttpApiPort;
};

export async function bootstrapRuntime(api?: HttpApiPort): Promise<RuntimeBundle> {
  const port = api ?? new HttpApiPort(null);
  const manifest = await port.getManifest();
  const routes = new RouteResolver(manifest);
  const catalog = new CatalogRegistry(manifest);
  const tokens = new DesignTokenRegistry(manifest);
  tokens.applyToRoot();
  port.updateResolver(routes);
  return { manifest, routes, catalog, tokens, api: port };
}
