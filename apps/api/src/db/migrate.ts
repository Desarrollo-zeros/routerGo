import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
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

async function migrationFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  return files.filter((file) => file.endsWith('.sql')).sort();
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  try {
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
    for (const file of await migrationFiles(dir)) {
      console.log(`[migrate] applying ${file}`);
      await runMigration(pool, await readFile(path.join(dir, file), 'utf-8'));
    }
    console.log('[migrate] done');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[migrate] failed', e);
  process.exit(1);
});
