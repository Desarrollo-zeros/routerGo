import type { GetCatalogPort, GetCatalogOutput } from '../ports/inbound/GetCatalogPort';
import type { CatalogPort } from '../ports/outbound/CatalogPort';

export class GetCatalogUseCase implements GetCatalogPort {
  constructor(private readonly catalog: CatalogPort) {}
  async execute(): Promise<GetCatalogOutput> {
    const models = await this.catalog.listModels();
    return { models: models.map((m) => ({ logicalId: m.logicalId, tier: m.tier, creditPrice: m.creditPrice.toString(), enabled: m.enabled })) };
  }
}
