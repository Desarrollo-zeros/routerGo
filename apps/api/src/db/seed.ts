import pg from 'pg';
import { runSeed } from './seed/seed-runner.js';

const { Pool } = pg;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL missing');
  return url;
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  try {
    const result = await runSeed(pool);
    console.log(`[seed] ${result.status} version=${result.seedVersion} checksum=${result.checksum}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[seed] failed', e);
  process.exit(1);
});
