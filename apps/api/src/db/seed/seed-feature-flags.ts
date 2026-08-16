import type pg from 'pg';

type Flag = { key: string; default_value: boolean; rollout: Record<string, unknown> };

const FLAGS: Flag[] = [
  { key: 'activity_enabled', default_value: true, rollout: {} },
  { key: 'chat_enabled', default_value: true, rollout: {} },
  { key: 'sponsors_enabled', default_value: true, rollout: { max_per_session: 1 } },
  { key: 'admin_enabled', default_value: false, rollout: { roles: ['admin'] } },
  { key: 'pose_calibration', default_value: true, rollout: {} },
  { key: 'stream_resume', default_value: true, rollout: { ttl_minutes: 45 } },
  { key: 'battles_enabled', default_value: true, rollout: {} },
];

export async function seedFeatureFlags(client: pg.PoolClient): Promise<void> {
  for (const f of FLAGS) {
    await client.query(
      `INSERT INTO feature_flags(key, default_value, rollout_json, enabled)
       VALUES ($1,$2,$3,true)
       ON CONFLICT (key) DO UPDATE SET default_value=EXCLUDED.default_value, rollout_json=EXCLUDED.rollout_json, enabled=true`,
      [f.key, f.default_value, JSON.stringify(f.rollout)],
    );
  }
}
