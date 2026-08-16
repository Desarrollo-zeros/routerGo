import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import type { CreateBattle } from '../application/services/CreateBattle.js';

export async function createBattleHandler(req: unknown, service: CreateBattle): Promise<unknown> {
  const user = (req as { user?: { userId?: unknown } }).user;
  if (typeof user?.userId !== 'string') throw new AuthenticationRequiredError();
  return service.execute({ userId: user.userId });
}
