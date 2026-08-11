import type pg from 'pg';

type Token = { key: string; type: string; value: string; pair: string | null };

const TOKENS: Token[] = [
  { key: 'color.bg', type: 'color', value: '#0a0a0f', pair: 'color.text-primary' },
  { key: 'color.surface', type: 'color', value: '#14141c', pair: 'color.text-primary' },
  { key: 'color.surface-muted', type: 'color', value: '#1e1e2a', pair: 'color.text-secondary' },
  { key: 'color.brand', type: 'color', value: '#6c5ce7', pair: 'color.text-primary' },
  { key: 'color.brand-soft', type: 'color', value: '#a29bfe', pair: 'color.bg' },
  { key: 'color.success', type: 'color', value: '#00b894', pair: 'color.bg' },
  { key: 'color.warning', type: 'color', value: '#fdcb6e', pair: 'color.bg' },
  { key: 'color.danger', type: 'color', value: '#d63031', pair: 'color.text-primary' },
  { key: 'color.text-primary', type: 'color', value: '#f0f0f5', pair: 'color.bg' },
  { key: 'color.text-secondary', type: 'color', value: '#a0a0b8', pair: 'color.bg' },
  { key: 'color.text-disabled', type: 'color', value: '#63637a', pair: 'color.bg' },
  { key: 'spacing.4', type: 'dimension', value: '4px', pair: null },
  { key: 'spacing.8', type: 'dimension', value: '8px', pair: null },
  { key: 'spacing.16', type: 'dimension', value: '16px', pair: null },
  { key: 'font.sans', type: 'fontFamily', value: 'Inter, system-ui, sans-serif', pair: null },
  { key: 'radius.md', type: 'dimension', value: '12px', pair: null },
];

export async function seedDesignTokens(client: pg.PoolClient): Promise<void> {
  for (const t of TOKENS) {
    await client.query(
      `INSERT INTO design_tokens(theme, token_key, token_type, token_value, contrast_pair, mode, version, enabled)
       VALUES ('default',$1,$2,$3,$4,'dark',1,true)
       ON CONFLICT (theme, token_key) DO UPDATE SET token_type=EXCLUDED.token_type, token_value=EXCLUDED.token_value, contrast_pair=EXCLUDED.contrast_pair, enabled=true`,
      [t.key, t.type, t.value, t.pair],
    );
  }
}
