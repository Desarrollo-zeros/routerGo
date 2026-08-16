import type { GetPublicAd } from '../application/use-cases/GetPublicAd.js';

export async function publicAdHandler(req: unknown, useCase: GetPublicAd): Promise<unknown> {
  const query = (req as { query?: Record<string, unknown> }).query;
  const placementKey = typeof query?.placement === 'string' ? query.placement.trim() : '';
  if (!placementKey) throw new Error('PLACEMENT_REQUIRED');
  return useCase.execute(placementKey);
}
