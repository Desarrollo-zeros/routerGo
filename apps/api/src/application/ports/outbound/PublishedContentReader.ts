export type PublishedContentView = { slug: string; title: string; body: string };

export interface PublishedContentReader {
  list(): Promise<PublishedContentView[]>;
  findBySlug(slug: string): Promise<PublishedContentView | null>;
}
