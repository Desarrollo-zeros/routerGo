import type pg from "pg";
import { randomUUID } from "node:crypto";
import type { AuthUser, AuthUserRepository } from "../../../application/services/SessionAuthService.js";
import type { SessionPrincipal } from "../../../application/ports/outbound/SessionAuthPort.js";

type UserRow = { id: string; email: string; password_hash: string; wallet_id: string };
type SessionRow = SessionPrincipal;

export class PostgresAuthUserRepository implements AuthUserRepository {
  constructor(private readonly pool: pg.Pool) {}

  async create(email: string, passwordHash: string): Promise<AuthUser> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const user = await client.query<{ id: string; email: string }>("INSERT INTO users(id,email,password_hash) VALUES ($1,$2,$3) RETURNING id,email", [`usr_${randomUUID()}`, email, passwordHash]);
      const row = user.rows[0];
      const walletId = `wal_${randomUUID()}`;
      await client.query("INSERT INTO wallets(id,user_id) VALUES ($1,$2)", [walletId, row.id]);
      await client.query("COMMIT");
      return { id: row.id, email: row.email, passwordHash, walletId };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.pool.query<UserRow>("SELECT u.id,u.email,u.password_hash,w.id AS wallet_id FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.email=$1 AND u.status='ACTIVE'", [email]);
    const row = result.rows[0];
    return row ? { id: row.id, email: row.email, passwordHash: row.password_hash, walletId: row.wallet_id } : null;
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> { await this.pool.query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,$3)", [tokenHash, userId, expiresAt]); }
  async findSession(tokenHash: string): Promise<SessionPrincipal | null> {
    const result = await this.pool.query<SessionRow>("SELECT s.user_id AS \"userId\",w.id AS \"walletId\",u.email FROM auth_sessions s JOIN users u ON u.id=s.user_id AND u.status='ACTIVE' JOIN wallets w ON w.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()", [tokenHash]);
    return result.rows[0] ?? null;
  }
  async deleteSession(tokenHash: string): Promise<void> { await this.pool.query("DELETE FROM auth_sessions WHERE token_hash=$1", [tokenHash]); }
}
