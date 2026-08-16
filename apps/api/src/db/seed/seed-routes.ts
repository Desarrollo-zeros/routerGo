import type pg from 'pg';

type Route = { route_key: string; method: string; path: string; use_case: string; auth: string; req: string | null; res: string | null };

const ROUTES: Route[] = [
  { route_key: 'health', method: 'GET', path: '/health', use_case: 'healthCheck', auth: 'public', req: null, res: 'healthResponse' },
  { route_key: 'readiness', method: 'GET', path: '/readiness', use_case: 'readinessCheck', auth: 'public', req: null, res: 'healthResponse' },
  { route_key: 'runtime-manifest', method: 'GET', path: '/runtime-manifest', use_case: 'getManifest', auth: 'public', req: null, res: 'manifestResponse' },
  { route_key: 'catalog-list', method: 'GET', path: '/catalog', use_case: 'getCatalog', auth: 'session', req: null, res: 'catalogResponse' },
  { route_key: 'developer-models', method: 'GET', path: '/v1/models', use_case: 'listModels', auth: 'api_key', req: null, res: 'modelsResponse' },
  { route_key: 'developer-chat-completions', method: 'POST', path: '/v1/chat/completions', use_case: 'chatCompletions', auth: 'api_key', req: 'chatCompletionsRequest', res: 'chatCompletionsResponse' },
  { route_key: 'developer-responses', method: 'POST', path: '/v1/responses', use_case: 'responses', auth: 'api_key', req: 'responsesRequest', res: 'responsesResponse' },
  { route_key: 'wallet-get', method: 'GET', path: '/wallet', use_case: 'getWallet', auth: 'session', req: null, res: 'walletResponse' },
  { route_key: 'wallet-ledger', method: 'GET', path: '/wallet/ledger', use_case: 'getWalletLedger', auth: 'session', req: null, res: 'ledgerResponse' },
  { route_key: 'activity-verify', method: 'POST', path: '/activities/:id/verify', use_case: 'verifyActivity', auth: 'session', req: 'verifyActivityRequest', res: 'verifyActivityResponse' },
  { route_key: 'quote-create', method: 'POST', path: '/quotes', use_case: 'createQuote', auth: 'session', req: 'createQuoteRequest', res: 'quoteResponse' },
  { route_key: 'run-create', method: 'POST', path: '/runs', use_case: 'createRun', auth: 'session', req: 'createRunRequest', res: 'runResponse' },
  { route_key: 'run-events', method: 'GET', path: '/runs/:id/events', use_case: 'streamRun', auth: 'session', req: null, res: 'streamResponse' },
  { route_key: 'admin-economy', method: 'GET', path: '/admin/economy', use_case: 'getEconomy', auth: 'api_key', req: null, res: 'economyResponse' },
  { route_key: 'admin-wallet', method: 'GET', path: '/admin/wallet', use_case: 'getAdminWallet', auth: 'api_key', req: null, res: 'walletResponse' },
  { route_key: 'admin-ledger', method: 'GET', path: '/admin/ledger', use_case: 'getLedger', auth: 'api_key', req: null, res: 'ledgerResponse' },
  { route_key: 'admin-runtime-publish', method: 'POST', path: '/admin/runtime/publish', use_case: 'publishRuntime', auth: 'api_key', req: null, res: 'runtimeManifestResponse' },
  { route_key: 'admin-runtime-rollback', method: 'POST', path: '/admin/runtime/rollback', use_case: 'rollbackRuntime', auth: 'api_key', req: 'runtimeRollbackRequest', res: 'runtimeManifestResponse' },
];

export async function seedRoutes(client: pg.PoolClient): Promise<void> {
  for (const r of ROUTES) {
    await client.query(
      `INSERT INTO api_routes(route_key, method, path_template, version, use_case_key, auth_policy_key, request_schema_key, response_schema_key, enabled, manifest_version)
       VALUES ($1,$2,$3,'v1',$4,$5,$6,$7,true,1)
       ON CONFLICT (route_key) DO UPDATE SET method=EXCLUDED.method, path_template=EXCLUDED.path_template, use_case_key=EXCLUDED.use_case_key, auth_policy_key=EXCLUDED.auth_policy_key, request_schema_key=EXCLUDED.request_schema_key, response_schema_key=EXCLUDED.response_schema_key, enabled=true`,
      [r.route_key, r.method, r.path, r.use_case, r.auth, r.req, r.res],
    );
  }
}
