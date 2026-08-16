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
import { FeatureFlagRegistry } from "./FeatureFlagRegistry";
import { NavigationRegistry } from "./NavigationRegistry";
import { RouteRegistry } from "./RouteRegistry";

export type RuntimeBundle = {
  manifest: RuntimeManifest;
  routes: RouteResolver;
  screens: RouteRegistry;
  navigation: NavigationRegistry;
  flags: FeatureFlagRegistry;
  catalog: CatalogRegistry;
  tokens: DesignTokenRegistry;
  api: HttpApiPort;
};

export async function bootstrapRuntime(api?: HttpApiPort): Promise<RuntimeBundle> {
  const port = api ?? new HttpApiPort(null);
  const manifest = await port.getManifest();
  const routes = new RouteResolver(manifest);
  const flags = new FeatureFlagRegistry(manifest);
  const screens = new RouteRegistry();
  const navigation = new NavigationRegistry(manifest, flags);
  const catalog = new CatalogRegistry(manifest);
  const tokens = new DesignTokenRegistry(manifest);
  tokens.applyToRoot();
  port.updateResolver(routes);
  return { manifest, routes, screens, navigation, flags, catalog, tokens, api: port };
}
