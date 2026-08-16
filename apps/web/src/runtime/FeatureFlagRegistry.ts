import type { RuntimeManifest } from "./types";

export class FeatureFlagRegistry {
  private readonly flags: ReadonlyMap<string, boolean>;

  constructor(manifest: RuntimeManifest) {
    this.flags = new Map(Object.entries(manifest.featureFlags));
  }

  isEnabled(key: string | null | undefined): boolean {
    return key === null || key === undefined ? true : this.flags.get(key) === true;
  }

  has(key: string): boolean { return this.flags.has(key); }

  list(): Array<{ key: string; enabled: boolean }> {
    return [...this.flags.entries()].map(([key, enabled]) => ({ key, enabled }));
  }
}
