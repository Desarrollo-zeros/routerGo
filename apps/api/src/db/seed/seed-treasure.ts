import type pg from 'pg';

const ORGANIZATION = ['routergo-public', 'RouterGo Public Hunts', 'routergo-public', 'INTERNAL'] as const;

export async function seedTreasure(client: pg.PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO organizations(id,name,slug,kind,status) VALUES ($1,$2,$3,$4,'ACTIVE')
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, status='ACTIVE'`, [...ORGANIZATION],
  );
  await client.query(
    `INSERT INTO treasure_hunts(id,owner_organization_id,title,status,public_location_reviewed)
     VALUES ('hunt-routergo-demo',$1,'Ruta de bienvenida','ACTIVE',true)
     ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, status='ACTIVE', public_location_reviewed=true`, [ORGANIZATION[0]],
  );
  await client.query(
    `INSERT INTO treasure_steps(id,hunt_id,sequence,proof_type,location_kind,geohash,radius_meters)
     VALUES ('step-routergo-demo-1','hunt-routergo-demo',1,'COARSE_GEOFENCE','PUBLIC_PARK','9q8yy',250)
     ON CONFLICT (id) DO UPDATE SET location_kind=EXCLUDED.location_kind, geohash=EXCLUDED.geohash, radius_meters=EXCLUDED.radius_meters`,
  );
}
