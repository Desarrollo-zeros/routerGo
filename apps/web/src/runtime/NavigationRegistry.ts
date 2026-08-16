import { LabelRegistry } from "./LabelRegistry";
import type { NavItem, RuntimeManifest } from "./types";
import { FeatureFlagRegistry } from "./FeatureFlagRegistry";

export type CapabilityChecker = (capability: string) => boolean;
export type NavigationItem = NavItem & { label: string; path: string };

export class NavigationRegistry {
  private readonly labels = new LabelRegistry();

  constructor(
    private readonly manifest: RuntimeManifest,
    private readonly flags: FeatureFlagRegistry,
    private readonly canAccess: CapabilityChecker = () => false,
  ) {}

  list(): NavigationItem[] {
    return this.manifest.ui.navigation
      .map((item) => this.resolve(item))
      .filter((item): item is NavigationItem => item !== undefined)
      .filter((item) => item.enabled)
      .filter((item) => this.flags.isEnabled(item.feature_flag))
      .filter((item) => !item.required_capability || this.canAccess(item.required_capability))
      .sort((left, right) => left.order_index - right.order_index);
  }

  private resolve(item: NavItem): NavigationItem | undefined {
    const route = this.manifest.ui.routes.find((candidate) => candidate.route_key === item.route_key);
    const label = this.labels.resolve(item.label_key);
    return route && route.enabled && label ? { ...item, label, path: route.path } : undefined;
  }
}
