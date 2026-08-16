import type { ContentEntry } from '../../../domain/cms/ContentEntry.js';

export interface CmsContentRepository {
  findById(id: string): Promise<ContentEntry | null>;
  save(content: ContentEntry): Promise<void>;
}
