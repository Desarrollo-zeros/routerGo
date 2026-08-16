export type SessionPrincipal = { userId: string; walletId: string; email: string };

export interface SessionAuthPort {
  register(email: string, password: string): Promise<{ principal: SessionPrincipal; token: string }>;
  login(email: string, password: string): Promise<{ principal: SessionPrincipal; token: string }>;
  authenticate(token: string): Promise<SessionPrincipal | null>;
  logout(token: string): Promise<void>;
}
