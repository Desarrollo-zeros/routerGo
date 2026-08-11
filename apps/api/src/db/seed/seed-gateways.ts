import type pg from 'pg';

type Gw = { id: string; key: string; display_name: string; kind: string };

const GATEWAYS: Gw[] = [
  { id: 'gw-zen', key: 'opencode-zen', display_name: 'OpenCode Zen', kind: 'ZEN' },
  { id: 'gw-go', key: 'opencode-go', display_name: 'OpenCode Go', kind: 'GO' },
];

export async function seedGateways(client: pg.PoolClient): Promise<void> {
  for (const g of GATEWAYS) {
    await client.query(
      `INSERT INTO provider_gateways(id, key, display_name, kind, auth_scheme, enabled, manifest_version)
       VALUES ($1,$2,$3,$4,'bearer',true,1)
       ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, kind=EXCLUDED.kind, enabled=true, manifest_version=1`,
      [g.id, g.key, g.display_name, g.kind],
    );
  }
}
