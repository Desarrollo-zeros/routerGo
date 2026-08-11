import type pg from 'pg';

type Ep = { id: string; gateway_id: string; protocol: string; base_url: string; path: string; req: string; res: string };

const ENDPOINTS: Ep[] = [
  { id: 'ep-zen-responses', gateway_id: 'gw-zen', protocol: 'responses', base_url: 'https://opencode.ai/zen/v1', path: '/responses', req: 'openai-responses', res: 'openai-responses' },
  { id: 'ep-zen-messages', gateway_id: 'gw-zen', protocol: 'messages', base_url: 'https://opencode.ai/zen/v1', path: '/messages', req: 'anthropic-messages', res: 'anthropic-messages' },
  { id: 'ep-zen-chat', gateway_id: 'gw-zen', protocol: 'chat_completions', base_url: 'https://opencode.ai/zen/v1', path: '/chat/completions', req: 'openai-chat', res: 'openai-chat' },
  { id: 'ep-go-responses', gateway_id: 'gw-go', protocol: 'responses', base_url: 'https://opencode.ai/zen/go/v1', path: '/responses', req: 'openai-responses', res: 'openai-responses' },
  { id: 'ep-go-messages', gateway_id: 'gw-go', protocol: 'messages', base_url: 'https://opencode.ai/zen/go/v1', path: '/messages', req: 'anthropic-messages', res: 'anthropic-messages' },
  { id: 'ep-go-chat', gateway_id: 'gw-go', protocol: 'chat_completions', base_url: 'https://opencode.ai/zen/go/v1', path: '/chat/completions', req: 'openai-chat', res: 'openai-chat' },
];

export async function seedEndpoints(client: pg.PoolClient): Promise<void> {
  for (const e of ENDPOINTS) {
    await client.query(
      `INSERT INTO provider_endpoints(id, gateway_id, protocol, base_url, path_template, request_mapper_key, response_mapper_key, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (id) DO UPDATE SET gateway_id=EXCLUDED.gateway_id, protocol=EXCLUDED.protocol, base_url=EXCLUDED.base_url, path_template=EXCLUDED.path_template, request_mapper_key=EXCLUDED.request_mapper_key, response_mapper_key=EXCLUDED.response_mapper_key, enabled=true`,
      [e.id, e.gateway_id, e.protocol, e.base_url, e.path, e.req, e.res],
    );
  }
}
