export interface CatalogModel {
  logicalId: string;
  providerModelId: string;
  gatewayId: string;
  tier: string;
  creditPrice: bigint;
  enabled: boolean;
  capabilities: Record<string, unknown>;
}

export interface CatalogPort {
  getModel(logicalId: string): Promise<CatalogModel | null>;
  listModels(): Promise<CatalogModel[]>;
  isEnabled(logicalId: string): Promise<boolean>;
}
