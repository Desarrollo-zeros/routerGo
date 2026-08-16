import type { ProviderPort, ProviderRequest, ProviderResponse } from '../../../application/ports/outbound/provider-port.js';
import { GatewayAdapterFactory } from './gateway-adapter-factory.js';
import { ReliabilityExecutor } from '../../reliability/reliability-executor.js';
import { CircuitBreaker } from '../../reliability/circuit-breaker.js';
import { readProviderStream } from './provider-stream-reader.js';

export interface HttpProviderAdapterDependencies {
  reliability: ReliabilityExecutor;
  breaker: CircuitBreaker;
  factory?: GatewayAdapterFactory;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export class HttpProviderAdapter implements ProviderPort {
  private readonly factory: GatewayAdapterFactory;
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly dependencies: HttpProviderAdapterDependencies) {
    this.factory = dependencies.factory ?? new GatewayAdapterFactory();
    this.fetcher = dependencies.fetcher ?? fetch;
    this.timeoutMs = dependencies.timeoutMs ?? 30_000;
  }

  async call(req: ProviderRequest, endpoint: ProviderPort['call'] extends (a: ProviderRequest, b: infer E) => Promise<unknown> ? E : never): Promise<ProviderResponse> {
    const strategy = this.factory.getStrategy(endpoint.strategyKey);
    const built = strategy.buildRequest(req);
    const url = joinUrl(endpoint.baseUrl, endpoint.pathTemplate || built.urlPath);
    const raw = await this.dependencies.reliability.execute(
      (signal) => this.send(url, built.body, signal, req.idempotencyKey),
      { timeoutMs: this.timeoutMs, idempotency: { mode: 'KEYED', key: req.idempotencyKey ?? req.model }, breaker: this.dependencies.breaker },
    );
    const parsed = strategy.parseResponse(raw.body);
    return { ...parsed, requestId: raw.requestId };
  }

  async stream(req: ProviderRequest, endpoint: ProviderPort['call'] extends (a: ProviderRequest, b: infer E) => Promise<unknown> ? E : never, onChunk: (chunk: { delta: string; done: boolean; usage?: { inputTokens: number; outputTokens: number } }) => void): Promise<ProviderResponse> {
    const strategy = this.factory.getStrategy(endpoint.strategyKey);
    const built = strategy.buildRequest({ ...req, stream: true });
    const url = joinUrl(endpoint.baseUrl, endpoint.pathTemplate || built.urlPath);
    return this.dependencies.reliability.execute(
      (signal) => this.sendStream(url, { body: built.body, signal, idempotencyKey: req.idempotencyKey, strategy, onChunk }),
      { timeoutMs: this.timeoutMs, idempotency: { mode: 'KEYED', key: req.idempotencyKey ?? req.model }, breaker: this.dependencies.breaker },
    );
  }

  private async send(url: string, body: Record<string, unknown>, signal: AbortSignal, idempotencyKey?: string): Promise<{ body: unknown; requestId?: string }> {
    const headers: Record<string, string> = { 'content-type': 'application/json', ...providerHeaders() };
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
    const response = await this.fetcher(url, {
      method: 'POST', headers,
      body: JSON.stringify(body), signal,
    });
    const bodyValue = await response.json().catch(() => ({}));
    if (!response.ok) throw providerError(response.status, bodyValue);
    return { body: bodyValue, requestId: response.headers.get('x-request-id') ?? undefined };
  }

  private async sendStream(url: string, options: { body: Record<string, unknown>; signal: AbortSignal; idempotencyKey?: string; strategy: ReturnType<GatewayAdapterFactory['getStrategy']>; onChunk: (chunk: { delta: string; done: boolean; usage?: { inputTokens: number; outputTokens: number } }) => void }): Promise<ProviderResponse> {
    const { body, signal, idempotencyKey, strategy, onChunk } = options;
    const headers: Record<string, string> = { accept: 'text/event-stream', 'content-type': 'application/json', ...providerHeaders() };
    if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
    const response = await this.fetcher(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
    if (!response.ok || !response.body) throw providerError(response.status, await response.text());
    return readProviderStream({ body: response.body, strategy, onChunk, requestId: response.headers.get('x-request-id') });
  }
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function providerHeaders(): Record<string, string> {
  const key = process.env.LITELLM_API_KEY;
  return key ? { authorization: `Bearer ${key}` } : {};
}

function providerError(status: number, body: unknown): Error & { status: number } {
  const error = new Error(`Provider request failed with status ${status}`) as Error & { status: number };
  error.status = status;
  return error;
}
