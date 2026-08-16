import type pg from 'pg';

const UI_ROUTES = [
  ['catalog-list', '/catalog', 'catalog'],
  ['wallet-get', '/wallet', 'wallet'],
  ['activity-verify', '/', 'activity'],
  ['quote-create', '/chat', 'chat'],
  ['admin-economy', '/economy', 'admin-economy'],
  ['battle-matchmaking', '/battles', 'battle'],
  ['treasure-list', '/treasure', 'treasure'],
] as const;

export async function seedUiRoutes(client: pg.PoolClient): Promise<void> {
  for (const [routeKey, path, screenKey] of UI_ROUTES) {
    await client.query(
      `INSERT INTO runtime_ui_routes(route_key, path, screen_key, enabled) VALUES ($1,$2,$3,true)
       ON CONFLICT (route_key) DO UPDATE SET path=EXCLUDED.path, screen_key=EXCLUDED.screen_key, enabled=true`,
      [routeKey, path, screenKey],
    );
  }
}
