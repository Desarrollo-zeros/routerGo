import type { PublishedContentReader } from '../ports/outbound/PublishedContentReader.js';

export class GetPublishedContent {
  constructor(private readonly reader: PublishedContentReader) {}

  execute(slug: string): Promise<Awaited<ReturnType<PublishedContentReader['findBySlug']>>> {
    return this.reader.findBySlug(slug);
  }
}
