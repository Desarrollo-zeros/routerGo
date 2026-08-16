import type { PublishedLearningReader } from '../ports/outbound/PublishedLearningReader.js';

export class ListPublishedLearning {
  constructor(private readonly reader: PublishedLearningReader) {}

  execute(): Promise<Awaited<ReturnType<PublishedLearningReader['listPublished']>>> {
    return this.reader.listPublished();
  }
}
