export interface GetCatalogOutput {
  models: Array<{
    logicalId: string;
    tier: string;
    creditPrice: string;
    enabled: boolean;
  }>;
}

export interface GetCatalogPort {
  execute(): Promise<GetCatalogOutput>;
}
