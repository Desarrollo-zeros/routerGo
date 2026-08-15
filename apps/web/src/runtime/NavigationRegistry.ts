import type { RouteResolver } from "./RouteResolver";
import type { NavItem, RuntimeManifest } from "./types";
import { FeatureFlagRegistry } from "./FeatureFlagRegistry";

export type CapabilityChecker = (capability: string) => boolean;

export class NavigationRegistry {
  constructor(
    private readonly manifest: RuntimeManifest,
    private readonly routes: RouteResolver,
    private readonly flags: FeatureFlagRegistry,
    private readonly canAccess: CapabilityChecker = () => false,
  ) {}

  list(): NavItem[] {
    return this.manifest.navigation
      .filter((item) => item.enabled && this.routes.has(item.route_key))
      .filter((item) => this.flags.isEnabled(item.feature_flag))
      .filter((item) => !item.required_capability || this.canAccess(item.required_capability))
      .sort((left, right) => left.order_index - right.order_index);
  }
}
