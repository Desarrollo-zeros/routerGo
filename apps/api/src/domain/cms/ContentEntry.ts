export type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export type MediaAsset = {
  id: string;
  storageKey: string;
  mediaType: string;
  byteSize: number;
  checksum: string;
};

export type ContentVersion = {
  id: string;
  version: number;
  title: string;
  body: string;
  media: readonly MediaAsset[];
  createdBy: string;
  createdAt: Date;
};

type ContentState = {
  id: string;
  slug: string;
  createdBy: string;
  status: ContentStatus;
  versions: ContentVersion[];
};

export class ContentEntry {
  private constructor(private readonly state: ContentState) {}

  static create(id: string, slug: string, createdBy: string, now: Date): ContentEntry {
    if (!id || !slug || !createdBy) throw new Error('CONTENT_INVALID_IDENTITY');
    return new ContentEntry({ id, slug: normalizeSlug(slug), createdBy, status: 'DRAFT', versions: [{
      id: `${id}:v1`, version: 1, title: '', body: '', media: [], createdBy, createdAt: now,
    }] });
  }

  get id(): string { return this.state.id; }
  get slug(): string { return this.state.slug; }
  get createdBy(): string { return this.state.createdBy; }
  get currentStatus(): ContentStatus { return this.state.status; }
  get currentVersion(): ContentVersion { return this.state.versions[this.state.versions.length - 1]!; }
  get allVersions(): readonly ContentVersion[] { return this.state.versions.map((version) => ({ ...version, media: [...version.media] })); }

  addVersion(input: { id: string; title: string; body: string; createdBy: string; createdAt: Date; media?: readonly MediaAsset[] }): ContentVersion {
    if (!['DRAFT', 'IN_REVIEW'].includes(this.state.status)) throw new Error('CONTENT_VERSION_LOCKED');
    if (!input.id || !input.title.trim() || !input.body.trim()) throw new Error('CONTENT_VERSION_INVALID');
    const version = { id: input.id, version: this.state.versions.length + 1, title: input.title.trim(), body: input.body, media: validateMedia(input.media ?? []), createdBy: input.createdBy, createdAt: input.createdAt };
    this.state.versions.push(version);
    this.state.status = 'DRAFT';
    return version;
  }

  transition(next: ContentStatus): void {
    if (!allowedTransitions[this.state.status].includes(next)) throw new Error('CONTENT_INVALID_TRANSITION');
    this.state.status = next;
  }
}

const allowedTransitions: Record<ContentStatus, readonly ContentStatus[]> = {
  DRAFT: ['IN_REVIEW'], IN_REVIEW: ['DRAFT', 'APPROVED'], APPROVED: ['IN_REVIEW', 'PUBLISHED'],
  PUBLISHED: ['ARCHIVED'], ARCHIVED: [],
};

function normalizeSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) throw new Error('CONTENT_INVALID_SLUG');
  return normalized;
}

function validateMedia(media: readonly MediaAsset[]): readonly MediaAsset[] {
  for (const asset of media) if (!asset.id || !asset.storageKey || !asset.mediaType || asset.byteSize <= 0 || !asset.checksum) throw new Error('MEDIA_INVALID_METADATA');
  return media.map((asset) => ({ ...asset }));
}
