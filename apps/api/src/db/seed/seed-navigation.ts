import type pg from 'pg';

type Nav = { route_key: string; screen_key: string; label_key: string; icon_key: string | null; order_index: number; flag: string | null };

const NAVS: Nav[] = [
  { route_key: 'catalog-list', screen_key: 'catalog', label_key: 'nav.catalog', icon_key: 'grid', order_index: 1, flag: null },
  { route_key: 'wallet-get', screen_key: 'wallet', label_key: 'nav.wallet', icon_key: 'wallet', order_index: 2, flag: null },
  { route_key: 'activity-verify', screen_key: 'activity', label_key: 'nav.activity', icon_key: 'activity', order_index: 0, flag: 'activity_enabled' },
  { route_key: 'quote-create', screen_key: 'chat', label_key: 'nav.chat', icon_key: 'message', order_index: 3, flag: 'chat_enabled' },
  { route_key: 'admin-economy', screen_key: 'admin-economy', label_key: 'nav.economy', icon_key: 'chart', order_index: 99, flag: 'admin_enabled' },
];

export async function seedNavigation(client: pg.PoolClient): Promise<void> {
  for (const n of NAVS) {
    await client.query(
      `INSERT INTO ui_navigation(route_key, screen_key, label_key, icon_key, order_index, feature_flag, enabled, manifest_version)
       VALUES ($1,$2,$3,$4,$5,$6,true,1)
       ON CONFLICT (route_key) DO UPDATE SET screen_key=EXCLUDED.screen_key, label_key=EXCLUDED.label_key, icon_key=EXCLUDED.icon_key, order_index=EXCLUDED.order_index, feature_flag=EXCLUDED.feature_flag, enabled=true`,
      [n.route_key, n.screen_key, n.label_key, n.icon_key, n.order_index, n.flag],
    );
  }
}
