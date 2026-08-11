export type FetchOpts = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function httpRequest<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    signal: opts.signal,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${opts.method ?? "GET"} ${url} -> ${res.status} ${msg}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function buildUrl(path: string, query?: Record<string, string>): string {
  if (!query) return path;
  const qs = new URLSearchParams(query).toString();
  return qs ? `${path}?${qs}` : path;
}
