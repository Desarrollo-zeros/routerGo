import type { PublishedContentView } from './PublishedContentReader.js';

export type ContentPublishInput = {
  slug: string;
  title: string;
  body: string;
  actorId: string;
};

export interface ContentPublisher {
  publish(input: ContentPublishInput): Promise<PublishedContentView>;
}
