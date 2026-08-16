import type { PublishedContentReader } from '../ports/outbound/PublishedContentReader.js';

export class ListPublishedContent {
  constructor(private readonly reader: PublishedContentReader) {}

  execute(): Promise<Awaited<ReturnType<PublishedContentReader['list']>>> {
    return this.reader.list();
  }
}
