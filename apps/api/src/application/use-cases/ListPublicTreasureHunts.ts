import type { TreasureHuntReader } from '../ports/outbound/TreasureHuntReader.js';

export class ListPublicTreasureHunts {
  constructor(private readonly reader: TreasureHuntReader) {}

  execute(): Promise<Awaited<ReturnType<TreasureHuntReader['listActive']>>> {
    return this.reader.listActive();
  }
}
