import type pg from 'pg';
import type { PublishedContentReader, PublishedContentView } from '../../../application/ports/outbound/PublishedContentReader.js';

type Row = { slug: string; title: string; body: string };

export class PostgresPublishedContentReader implements PublishedContentReader {
  constructor(private readonly pool: pg.Pool) {}

  async list(): Promise<PublishedContentView[]> {
    const result = await this.pool.query<Row>(`${selectSql()} ORDER BY e.slug`);
    return result.rows;
  }

  async findBySlug(slug: string): Promise<PublishedContentView | null> {
    const result = await this.pool.query<Row>(`${selectSql()} AND e.slug=$1`, [slug]);
    return result.rows[0] ?? null;
  }
}

function selectSql(): string {
  return `SELECT e.slug,v.title,v.body FROM cms_content_entries e
    JOIN cms_content_versions v ON v.content_id=e.id AND v.status='PUBLISHED'
    WHERE e.status='PUBLISHED' AND v.version=(SELECT max(v2.version) FROM cms_content_versions v2 WHERE v2.content_id=e.id)`;
}
