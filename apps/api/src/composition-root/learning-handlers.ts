import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import type { ListPublishedLearning } from '../application/use-cases/ListPublishedLearning.js';

export async function listLearningHandler(req: unknown, useCase: ListPublishedLearning): Promise<unknown> {
  const user = (req as { user?: { userId?: unknown } }).user;
  if (typeof user?.userId !== 'string') throw new AuthenticationRequiredError();
  return useCase.execute();
}
