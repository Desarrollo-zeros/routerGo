import type { RuntimeManifest, ManifestRoute } from "./types";

export class RouteResolver {
  private map = new Map<string, ManifestRoute>();

  constructor(manifest: RuntimeManifest) {
    for (const r of manifest.apiRoutes) if (r.enabled) this.map.set(r.route_key, r);
  }

  resolve(key: string): ManifestRoute {
    const r = this.map.get(key);
    if (!r) throw new Error(`Route not found: ${key}`);
    return r;
  }

  pathFor(key: string, params: Record<string, string> = {}): string {
    const r = this.resolve(key);
    let p = r.path_template;
    for (const [k, v] of Object.entries(params)) p = p.replace(`:${k}`, encodeURIComponent(v)).replace(`{${k}}`, encodeURIComponent(v));
    return p;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  list(): ManifestRoute[] {
    return [...this.map.values()];
  }
}
