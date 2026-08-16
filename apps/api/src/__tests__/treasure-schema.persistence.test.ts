import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo' });
const ids = { org: 't090-org', user: 't090-user', hunt: 't090-hunt', step: 't090-step' };

afterAll(async () => {
  await pool.query('DELETE FROM treasure_hunts WHERE id=$1', [ids.hunt]);
  await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
  await pool.end();
});

describe('treasure schema', () => {
  it('stores moderated coarse steps and progress without precise coordinates', async () => {
    await pool.query('DELETE FROM treasure_hunts WHERE id=$1', [ids.hunt]);
    await pool.query('DELETE FROM organizations WHERE id=$1', [ids.org]);
    await pool.query('DELETE FROM users WHERE id=$1', [ids.user]);
    await pool.query("INSERT INTO users(id,email) VALUES ($1,$2)", [ids.user, `${ids.user}@test.local`]);
    await pool.query("INSERT INTO organizations(id,name,slug,kind) VALUES ($1,'T090','t090','INTERNAL')", [ids.org]);
    await pool.query("INSERT INTO treasure_hunts(id,owner_organization_id,title,status,public_location_reviewed) VALUES ($1,$2,'Clues','APPROVED',true)", [ids.hunt, ids.org]);
    await pool.query("INSERT INTO treasure_steps(id,hunt_id,sequence,proof_type,location_kind,geohash,radius_meters) VALUES ($1,$2,1,'COARSE_GEOFENCE','PARK','9q8yy',250)", [ids.step, ids.hunt]);
    await pool.query('INSERT INTO treasure_progress(hunt_id,user_id,current_sequence) VALUES ($1,$2,1)', [ids.hunt, ids.user]);
    await expect(pool.query("INSERT INTO treasure_steps(id,hunt_id,sequence,proof_type,location_kind,geohash,radius_meters) VALUES ('t090-bad',$1,2,'COARSE_GEOFENCE','PARK','9q8yy123',250)", [ids.hunt])).rejects.toThrow();
    await expect(pool.query("INSERT INTO treasure_steps(id,hunt_id,sequence,proof_type,location_kind,radius_meters) VALUES ('t090-bad-2',$1,3,'COARSE_GEOFENCE','PARK',20)", [ids.hunt])).rejects.toThrow();
    await expect(pool.query("INSERT INTO treasure_steps(id,hunt_id,sequence,proof_type,location_kind,radius_meters) VALUES ('t090-bad-3',$1,4,'COARSE_GEOFENCE','PARK',250)", [ids.hunt])).rejects.toThrow();
  });
});
