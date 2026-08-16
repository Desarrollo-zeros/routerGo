import { createHash, randomBytes } from "node:crypto";
import type { SessionAuthPort, SessionPrincipal } from "../ports/outbound/SessionAuthPort.js";

export type AuthUser = { id: string; email: string; passwordHash: string; walletId: string };
export interface AuthUserRepository {
  create(email: string, passwordHash: string): Promise<AuthUser>;
  findByEmail(email: string): Promise<AuthUser | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findSession(tokenHash: string): Promise<SessionPrincipal | null>;
  deleteSession(tokenHash: string): Promise<void>;
}
export interface PasswordHasher { hash(password: string): string; verify(password: string, encoded: string): boolean; }

export class SessionAuthService implements SessionAuthPort {
  constructor(private readonly users: AuthUserRepository, private readonly passwords: PasswordHasher, private readonly ttlMs = 7 * 24 * 60 * 60 * 1000) {}

  async register(email: string, password: string) { this.validate(email, password); const user = await this.users.create(normalizeEmail(email), this.passwords.hash(password)); return this.issue(user); }
  async login(email: string, password: string) { this.validate(email, password); const user = await this.users.findByEmail(normalizeEmail(email)); if (!user || !this.passwords.verify(password, user.passwordHash)) throw new Error("InvalidCredentials"); return this.issue(user); }
  authenticate(token: string): Promise<SessionPrincipal | null> { return this.users.findSession(hashToken(token)); }
  logout(token: string): Promise<void> { return this.users.deleteSession(hashToken(token)); }

  private async issue(user: AuthUser) {
    const token = randomBytes(32).toString("base64url");
    await this.users.createSession(user.id, hashToken(token), new Date(Date.now() + this.ttlMs));
    return { principal: { userId: user.id, walletId: user.walletId, email: user.email }, token };
  }

  private validate(email: string, password: string): void {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error("InvalidEmail");
    if (password.length < 8) throw new Error("WeakPassword");
  }
}

function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
function hashToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
