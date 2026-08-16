import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import type { ListLeaderboard } from '../application/use-cases/ListLeaderboard.js';

export async function listLeaderboardHandler(req: unknown, useCase: ListLeaderboard): Promise<unknown> {
  const user = (req as { user?: { userId?: unknown } }).user;
  if (typeof user?.userId !== 'string') throw new AuthenticationRequiredError();
  return useCase.execute();
}
