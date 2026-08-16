import { describe, expect, it } from 'vitest';
import { ContentEntry } from './ContentEntry.js';

const now = new Date('2026-08-15T00:00:00Z');
const media = { id: 'asset-1', storageKey: 'cms/asset-1', mediaType: 'image/png', byteSize: 12, checksum: 'abc123' };

describe('ContentEntry', () => {
  it('keeps versions immutable and moves through the publication workflow', () => {
    const content = ContentEntry.create('content-1', 'Hello-World', 'author-1', now);
    content.addVersion({ id: 'content-1:v2', title: 'Title', body: 'Body', createdBy: 'author-1', createdAt: now, media: [media] });
    content.transition('IN_REVIEW');
    content.transition('APPROVED');
    content.transition('PUBLISHED');

    expect(content.slug).toBe('hello-world');
    expect(content.currentStatus).toBe('PUBLISHED');
    expect(content.currentVersion.media).toEqual([media]);
    expect(content.allVersions).toHaveLength(2);
  });

  it('rejects publication edits and invalid transitions', () => {
    const content = ContentEntry.create('content-2', 'safe-slug', 'author-1', now);
    content.transition('IN_REVIEW');
    content.transition('APPROVED');
    expect(() => content.addVersion({ id: 'bad', title: 'x', body: 'y', createdBy: 'author-1', createdAt: now })).toThrow('CONTENT_VERSION_LOCKED');
    expect(() => content.transition('DRAFT')).toThrow('CONTENT_INVALID_TRANSITION');
  });

  it('rejects unsafe media metadata without handling binary data', () => {
    const content = ContentEntry.create('content-3', 'media', 'author-1', now);
    expect(() => content.addVersion({ id: 'v2', title: 'Title', body: 'Body', createdBy: 'author-1', createdAt: now, media: [{ ...media, byteSize: 0 }] })).toThrow('MEDIA_INVALID_METADATA');
  });
});
