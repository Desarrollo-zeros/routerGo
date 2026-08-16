import type { Pool } from 'pg';
import type { BattleResultInput, BattleResultRepository, BattleResultWrite } from '../../../application/ports/outbound/BattleResultRepository.js';

export class PostgresBattleResultRepository implements BattleResultRepository {
  constructor(private readonly pool: Pool) {}

  async record(input: BattleResultInput): Promise<BattleResultWrite> {
    const result = await this.pool.query(
      `INSERT INTO battle_results(battle_id,winner_user_id,scores_json,completed_at)
       VALUES ($1,$2,$3,$4) ON CONFLICT (battle_id) DO NOTHING`,
      [input.battleId, input.winnerUserId ?? null, JSON.stringify(input.scores), input.completedAt],
    );
    return result.rowCount === 1 ? 'RECORDED' : 'DUPLICATE';
  }
}
