import type { RouteResolver } from "./RouteResolver";
import { parseRuntimeManifest, type RuntimeManifest } from "./types";

export type ApiCall = {
  routeKey: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export interface ApiPort {
  request<T>(call: ApiCall): Promise<T>;
  getManifest(): Promise<RuntimeManifest>;
}

export class HttpApiPort implements ApiPort {
  constructor(
    private resolver: RouteResolver | null,
    private baseUrl = "/api",
    private manifestBaseUrl = "",
  ) {}

  updateResolver(r: RouteResolver): void {
    this.resolver = r;
  }

  async request<T>(call: ApiCall): Promise<T> {
    if (!this.resolver) throw new Error("Resolver not ready");
    const route = this.resolver.resolve(call.routeKey);
    let url = this.pathFor(call.routeKey, call.params);
    if (call.query) {
      const qs = new URLSearchParams(call.query).toString();
      if (qs) url += `?${qs}`;
    }
    const res = await fetch(url, {
      method: route.method,
      headers: { "content-type": "application/json", ...call.headers },
      body: call.body ? JSON.stringify(call.body) : undefined,
      credentials: "include",
      signal: call.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${route.method} ${url} -> ${res.status} ${text}`);
    }
    return (await res.json()) as T;
  }

  async getManifest(): Promise<RuntimeManifest> {
    const res = await fetch(`${this.manifestBaseUrl}/runtime-manifest`, { credentials: "include" });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    return parseRuntimeManifest(await res.json());
  }

  pathFor(routeKey: string, params?: Record<string, string>): string {
    if (!this.resolver) throw new Error("Resolver not ready");
    return this.baseUrl + this.resolver.pathFor(routeKey, params);
  }
}
