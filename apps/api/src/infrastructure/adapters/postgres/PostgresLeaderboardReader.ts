import type { Pool } from 'pg';
import type { LeaderboardEntry, LeaderboardReader } from '../../../application/ports/outbound/LeaderboardReader.js';

type Row = { email: string; lifetime_earned: string };

export class PostgresLeaderboardReader implements LeaderboardReader {
  constructor(private readonly pool: Pool) {}

  async topUsers(limit: number): Promise<LeaderboardEntry[]> {
    const result = await this.pool.query<Row>(`SELECT u.email,COALESCE(SUM(CASE WHEN l.amount_signed>0 THEN l.amount_signed ELSE 0 END),0)::text AS lifetime_earned
      FROM users u JOIN wallets w ON w.user_id=u.id LEFT JOIN ledger_entries l ON l.wallet_id=w.id
      WHERE u.status='ACTIVE' GROUP BY u.id,u.email,u.created_at
      HAVING COALESCE(SUM(CASE WHEN l.amount_signed>0 THEN l.amount_signed ELSE 0 END),0)>0
      ORDER BY SUM(CASE WHEN l.amount_signed>0 THEN l.amount_signed ELSE 0 END) DESC,u.created_at ASC LIMIT $1`, [limit]);
    return result.rows.map((row, index) => ({ position: index + 1, handle: maskEmail(row.email), credits: row.lifetime_earned }));
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'Usuario RouterGo';
  return `${local.slice(0, 2)}•••@${domain}`;
}
