import type { Pool } from 'pg';
import type { PublishedLearning, PublishedLearningReader } from '../../../application/ports/outbound/PublishedLearningReader.js';

type Row = { id: string; challenge_key: string; content_json: Record<string, unknown>; lesson_count: string; max_reward_credits: string };

export class PostgresPublishedLearningReader implements PublishedLearningReader {
  constructor(private readonly pool: Pool) {}

  async listPublished(): Promise<PublishedLearning[]> {
    const result = await this.pool.query<Row>(`SELECT d.id,d.challenge_key,v.content_json,
      COALESCE(jsonb_array_length(v.content_json->'lessons'),1)::text AS lesson_count,
      r.max_reward_credits::text
      FROM challenge_definitions d JOIN challenge_versions v ON v.challenge_id=d.id
      JOIN challenge_reward_rules r ON r.challenge_version_id=v.id
      WHERE d.challenge_type='LEARNING' AND d.status='APPROVED' AND v.status='PUBLISHED'
      ORDER BY d.updated_at DESC`);
    return result.rows.map(toLearning);
  }
}

function toLearning(row: Row): PublishedLearning {
  const content = row.content_json;
  return {
    id: row.id,
    key: row.challenge_key,
    title: text(content.title, 'Ruta de aprendizaje'),
    summary: text(content.summary, 'Una ruta breve para aprender y practicar.'),
    lessonCount: Number(row.lesson_count),
    rewardCredits: row.max_reward_credits,
    lessons: lessons(content.lessons),
  };
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function lessons(value: unknown): { title: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'object' && item !== null ? { title: text((item as { title?: unknown }).title, 'Lección') } : { title: 'Lección' }));
}
