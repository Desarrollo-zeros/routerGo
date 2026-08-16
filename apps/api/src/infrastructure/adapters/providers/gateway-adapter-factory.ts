import type { Protocol, ProtocolStrategy } from './protocol-strategy.js';
import { ResponsesStrategy } from './responses-strategy.js';
import { MessagesStrategy } from './messages-strategy.js';
import { ChatCompletionsStrategy } from './chat-completions-strategy.js';

export type RequestMapperKey = Protocol | string;
export type ResponseMapperKey = Protocol | string;

export interface EndpointRecord {
  id: string;
  gatewayId: string;
  protocol: Protocol;
  baseUrl: string;
  pathTemplate: string;
  requestMapperKey: RequestMapperKey;
  responseMapperKey: ResponseMapperKey;
  enabled: boolean;
}

export interface GatewayRecord {
  id: string;
  key: string;
  displayName: string;
  enabled: boolean;
}

export class UnknownMapperError extends Error {
  constructor(key: string) {
    super(`Unknown mapper key: ${key}`);
    this.name = 'UnknownMapperError';
  }
}

export class GatewayAdapterFactory {
  private readonly strategies: Map<string, ProtocolStrategy>;

  constructor(strategies?: ProtocolStrategy[]) {
    const list = strategies ?? [new ResponsesStrategy(), new MessagesStrategy(), new ChatCompletionsStrategy()];
    this.strategies = new Map(list.map((s) => [s.protocol, s]));
  }

  getStrategy(key: RequestMapperKey): ProtocolStrategy {
    const aliases: Record<string, string> = {
      'openai-chat': 'chat_completions',
      'openai-responses': 'responses',
      'anthropic-messages': 'messages',
    };
    const s = this.strategies.get(aliases[key] ?? key);
    if (!s) throw new UnknownMapperError(key);
    return s;
  }

  createForEndpoint(endpoint: EndpointRecord): ProtocolStrategy {
    if (!endpoint.enabled) throw new Error(`Endpoint disabled: ${endpoint.id}`);
    return this.getStrategy(endpoint.requestMapperKey);
  }

  register(strategy: ProtocolStrategy): void {
    this.strategies.set(strategy.protocol, strategy);
  }

  supportedKeys(): string[] {
    return [...this.strategies.keys()];
  }
}
