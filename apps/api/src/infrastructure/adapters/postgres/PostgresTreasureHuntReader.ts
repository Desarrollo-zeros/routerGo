import type pg from 'pg';
import type { PublicTreasureHunt, TreasureHuntReader } from '../../../application/ports/outbound/TreasureHuntReader.js';

type HuntRow = { id: string; title: string; location_kind: string | null; step_count: number | string; status: string };

export class PostgresTreasureHuntReader implements TreasureHuntReader {
  constructor(private readonly pool: pg.Pool) {}

  async listActive(): Promise<PublicTreasureHunt[]> {
    const result = await this.pool.query<HuntRow>(
      `SELECT h.id, h.title, h.status, COALESCE(MIN(s.location_kind), 'Zona pública') AS location_kind,
              COUNT(s.id)::int AS step_count
       FROM treasure_hunts h
       LEFT JOIN treasure_steps s ON s.hunt_id = h.id
       WHERE h.status = 'ACTIVE' AND h.public_location_reviewed = true
       GROUP BY h.id, h.title, h.status
       ORDER BY h.updated_at DESC`,
    );
    return result.rows.map(toPublicHunt);
  }
}

function toPublicHunt(row: HuntRow): PublicTreasureHunt {
  return { id: row.id, title: row.title, locationKind: row.location_kind ?? 'Zona pública', stepCount: Number(row.step_count), status: row.status };
}
