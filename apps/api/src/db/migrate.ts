import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { Pool } = pg;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL missing');
  return url;
}

async function runMigration(pool: pg.Pool, sql: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const file = path.join(dir, 'migrations', '001_initial.sql');
  const sql = await readFile(file, 'utf-8');
  console.log('[migrate] applying 001_initial.sql');
  await runMigration(pool, sql);
  console.log('[migrate] done');
  await pool.end();
}

main().catch((e) => {
  console.error('[migrate] failed', e);
  process.exit(1);
});
