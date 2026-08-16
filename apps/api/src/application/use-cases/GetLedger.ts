import type { GetLedgerPort, LedgerReadRow } from '../ports/inbound/GetLedgerPort.js';
import type { AdminLedgerReader } from '../ports/outbound/AdminLedgerReader.js';

export class GetLedgerUseCase implements GetLedgerPort {
  constructor(private readonly reader: AdminLedgerReader) {}

  async execute(input: { identity: { organizationId: string }; limit?: number }): Promise<{ entries: LedgerReadRow[] }> {
    const limit = Number.isInteger(input.limit) ? Math.min(Math.max(input.limit ?? 50, 1), 100) : 50;
    return { entries: await this.reader.listByOrganization(input.identity.organizationId, limit) };
  }
}
