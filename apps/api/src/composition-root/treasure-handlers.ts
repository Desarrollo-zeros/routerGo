import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import type { ListPublicTreasureHunts } from '../application/use-cases/ListPublicTreasureHunts.js';

export async function listTreasureHandler(req: unknown, useCase: ListPublicTreasureHunts): Promise<unknown> {
  const user = (req as { user?: { userId?: unknown } }).user;
  if (typeof user?.userId !== 'string') throw new AuthenticationRequiredError();
  return useCase.execute();
}
