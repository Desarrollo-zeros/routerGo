import type { ContentPublisher } from '../ports/outbound/ContentPublisher.js';
import type { PublishedContentView } from '../ports/outbound/PublishedContentReader.js';

type ContentInput = { slug: string; title: string; body: string };

export class PublishContent {
  constructor(private readonly publisher: ContentPublisher) {}

  async execute(input: ContentInput, actorId: string): Promise<PublishedContentView> {
    const normalized = normalize(input, actorId);
    return this.publisher.publish(normalized);
  }
}

function normalize(input: ContentInput, actorId: string) {
  const slug = input.slug.trim();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title || !body || !actorId.trim()) throw new Error('CONTENT_INPUT_INVALID');
  return { slug, title, body, actorId: actorId.trim() };
}
