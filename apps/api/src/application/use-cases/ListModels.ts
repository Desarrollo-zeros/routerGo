import type { GetCatalogPort } from '../ports/inbound/GetCatalogPort';
import type { ListModelsOutput, ListModelsPort } from '../ports/inbound/ListModelsPort';

export class ListModelsUseCase implements ListModelsPort {
  constructor(private readonly catalog: GetCatalogPort) {}

  async execute(): Promise<ListModelsOutput> {
    const catalog = await this.catalog.execute();
    return {
      object: 'list',
      data: catalog.models.filter((model) => model.enabled).map((model) => ({ id: model.logicalId, object: 'model', created: 0, owned_by: 'routergo' })),
    };
  }
}
