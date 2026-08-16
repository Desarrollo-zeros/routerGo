import type pg from 'pg';

const ORGANIZATION = ['routergo-house', 'RouterGo House Inventory', 'routergo-house', 'INTERNAL'] as const;

export async function seedAds(client: pg.PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,$2,$3,$4,'ACTIVE')
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status='ACTIVE'`, [...ORGANIZATION],
  );
  await client.query(
    `INSERT INTO advertisers(organization_id,status) VALUES ($1,'ACTIVE')
     ON CONFLICT (organization_id) DO UPDATE SET status='ACTIVE'`, [ORGANIZATION[0]],
  );
  await client.query(
    `INSERT INTO advertiser_accounts(id,organization_id,balance_micro,currency_code,status)
     VALUES ('account-routergo-house',$1,100000000,'USD','ACTIVE')
     ON CONFLICT (id) DO UPDATE SET balance_micro=EXCLUDED.balance_micro,status='ACTIVE'`, [ORGANIZATION[0]],
  );
  await client.query(
    `INSERT INTO campaigns(id,organization_id,account_id,name,status,moderation_status,budget_micro,sponsored_label)
     VALUES ('campaign-routergo-house',$1,'account-routergo-house','RouterGo entrenamiento','ACTIVE','APPROVED',1000000,'RouterGo')
     ON CONFLICT (id) DO UPDATE SET status='ACTIVE',moderation_status='APPROVED',sponsored_label='RouterGo'`, [ORGANIZATION[0]],
  );
  await client.query(
    `INSERT INTO creatives(id,campaign_id,kind,payload_json,moderation_status)
     VALUES ('creative-routergo-house','campaign-routergo-house','IMAGE',$1,'APPROVED')
     ON CONFLICT (id) DO UPDATE SET payload_json=EXCLUDED.payload_json,moderation_status='APPROVED'`, [JSON.stringify({ title: 'Entrena y recupera GoCredits', body: 'Convierte tu esfuerzo verificado en acceso instantáneo.', imageUrl: '/exercise-pushup.png', clickUrl: '/activity' })],
  );
  for (const [id, placementKey] of [['placement-activity-inline', 'activity-inline'], ['placement-chat-inline', 'chat-inline']] as const) {
    await client.query(
      `INSERT INTO placements(id,placement_key,surface,status) VALUES ($1,$2,'PWA','ACTIVE')
       ON CONFLICT (id) DO UPDATE SET placement_key=EXCLUDED.placement_key,surface='PWA',status='ACTIVE'`, [id, placementKey],
    );
  }
}
