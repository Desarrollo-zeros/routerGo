import type pg from 'pg';
import type { ContentPublisher, ContentPublishInput } from '../../../application/ports/outbound/ContentPublisher.js';
import type { PublishedContentView } from '../../../application/ports/outbound/PublishedContentReader.js';

export class PostgresContentPublisher implements ContentPublisher {
  constructor(private readonly pool: pg.Pool) {}

  async publish(input: ContentPublishInput): Promise<PublishedContentView> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const entry = await upsertEntry(client, input);
      const version = await nextVersion(client, entry.id);
      await client.query(
        `INSERT INTO cms_content_versions(id,content_id,version,title,body,status,created_by)
         VALUES ($1,$2,$3,$4,$5,'PUBLISHED',$6)`,
        [`cms-version-${entry.id}-${version}`, entry.id, version, input.title, input.body, input.actorId],
      );
      await client.query('COMMIT');
      return { slug: input.slug, title: input.title, body: input.body };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
}

async function upsertEntry(client: pg.PoolClient, input: ContentPublishInput): Promise<{ id: string }> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO cms_content_entries(id,slug,status,created_by)
     VALUES ($1,$2,'PUBLISHED',$3)
     ON CONFLICT (slug) DO UPDATE SET status='PUBLISHED',updated_at=now()
     RETURNING id`,
    [`cms-${input.slug}`, input.slug, input.actorId],
  );
  return result.rows[0];
}

async function nextVersion(client: pg.PoolClient, contentId: string): Promise<number> {
  const result = await client.query<{ next_version: number }>(
    'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM cms_content_versions WHERE content_id=$1',
    [contentId],
  );
  return Number(result.rows[0].next_version);
}
