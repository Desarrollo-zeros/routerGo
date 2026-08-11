import type { RuntimeManifest, CatalogEntry } from "./types";

export class CatalogRegistry {
  private byId = new Map<string, CatalogEntry>();
  private byTier = new Map<string, CatalogEntry[]>();

  constructor(manifest: RuntimeManifest) {
    const list = (manifest as unknown as { catalog?: CatalogEntry[]; models?: CatalogEntry[] }).catalog
      ?? (manifest as unknown as { models?: CatalogEntry[] }).models
      ?? [];
    for (const e of list) {
      if (!e.enabled) continue;
      this.byId.set(e.logical_id, e);
      const arr = this.byTier.get(e.tier) ?? [];
      arr.push(e);
      this.byTier.set(e.tier, arr);
    }
  }

  get(id: string): CatalogEntry | undefined {
    return this.byId.get(id);
  }

  list(): CatalogEntry[] {
    return [...this.byId.values()];
  }

  listByTier(tier: CatalogEntry["tier"]): CatalogEntry[] {
    return [...(this.byTier.get(tier) ?? [])];
  }

  priceOf(id: string): number | null {
    const e = this.byId.get(id);
    return e ? e.credit_price : null;
  }

  isAvailable(id: string): boolean {
    return this.byId.has(id);
  }
}
