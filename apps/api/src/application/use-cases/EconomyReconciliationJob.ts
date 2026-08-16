import type { ReconcileEconomyPort } from '../ports/inbound/ReconcileEconomyPort';

export type EconomyJobHandler = (name: string, data: unknown) => Promise<void>;

export class EconomyReconciliationJob {
  constructor(private readonly useCase: ReconcileEconomyPort) {}

  async handle(_name: string, data: unknown): Promise<void> {
    await this.useCase.execute({ limit: readLimit(data) });
  }

  asHandler(): EconomyJobHandler {
    return (name, data) => this.handle(name, data);
  }
}

function readLimit(data: unknown): number | undefined {
  if (typeof data !== 'object' || data === null || !('limit' in data)) return undefined;
  const value = data.limit;
  return typeof value === 'number' ? value : undefined;
}
