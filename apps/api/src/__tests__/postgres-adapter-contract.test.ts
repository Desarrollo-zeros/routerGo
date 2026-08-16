import pg from 'pg';
import { afterAll, describe, expect, it } from 'vitest';
import { nanoid } from 'nanoid';
import { LedgerEntry } from '../domain/entities/LedgerEntry';
import { Credits } from '../domain/value-objects/Credits';
import { ChatQuote } from '../domain/entities/ChatQuote';
import { ChatRun } from '../domain/entities/ChatRun';
import { LedgerPostgresRepository } from '../infrastructure/adapters/postgres/LedgerPostgresRepository';
import { OutboxPostgresAdapter } from '../infrastructure/adapters/postgres/OutboxPostgresAdapter';
import { QuotePostgresRepository } from '../infrastructure/adapters/postgres/QuotePostgresRepository';
import { RunPostgresRepository } from '../infrastructure/adapters/postgres/RunPostgresRepository';
import { PoolPostgresAdapter } from '../infrastructure/adapters/postgres/PoolPostgresAdapter';
import { createEvent } from '../domain/events/DomainEvent';
import { loadRuntimeManifest } from '../config/RuntimeManifest';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5432/routergo',
});

afterAll(async () => pool.end());

describe('Postgres adapter contracts', () => {
  it('persists and reloads a ledger entry using the migration schema', async () => {
    const ids = await createWalletFixture(50n);
    try {
      const repository = new LedgerPostgresRepository(pool);
      const entry = LedgerEntry.create({
        id: nanoid(), walletId: ids.walletId, kind: 'earn', amount: Credits.of(50n),
        idempotencyKey: nanoid(), refId: ids.userId, createdAt: new Date(), metadata: { source: 'test' },
      });

      await repository.insert(entry);
      const raw = await pool.query(
        'SELECT type, amount_signed, request_hash, meta_json FROM ledger_entries WHERE id=$1', [entry.id],
      );
      const reloaded = await repository.findByIdempotency(ids.walletId, entry.idempotencyKey);

      expect(raw.rows[0]).toMatchObject({ type: 'EARN', amount_signed: '50', request_hash: ids.userId, meta_json: { source: 'test' } });
      expect(reloaded?.kind).toBe('earn');
      expect(reloaded?.amount.toString()).toBe('50');
    } finally {
      await deleteWalletFixture(ids);
    }
  });

  it('writes domain events to the transactional outbox schema', async () => {
    const aggregateId = `audit-${nanoid(8)}`;
    const repository = new OutboxPostgresAdapter(pool);
    await repository.publish(createEvent('CreditsEarned', aggregateId, { amount: '50' }));

    const raw = await pool.query(
      'SELECT event_type, aggregate_type, aggregate_id, payload_json, published_at FROM outbox_events WHERE aggregate_id=$1',
      [aggregateId],
    );
    const pending = await repository.fetchUnprocessed(1000);

    expect(raw.rows[0]).toMatchObject({
      event_type: 'CreditsEarned', aggregate_type: 'RouterGoAggregate', aggregate_id: aggregateId,
      payload_json: { amount: '50' }, published_at: null,
    });
    expect(pending.some((event) => event.aggregateId === aggregateId)).toBe(true);
  });

  it('persists quotes and runs using canonical model and charge columns', async () => {
    const ids = await createWalletFixture(1000n);
    const quoteId = `quote-${nanoid(8)}`;
    try {
      const now = new Date();
      const quote = ChatQuote.create({
        id: quoteId, userId: ids.userId, walletId: ids.walletId, modelId: 'deepseek-v4-flash-free',
        tier: 'FREE', creditPrice: Credits.of(0n), idempotencyKey: nanoid(),
        createdAt: now, expiresAt: new Date(now.getTime() + 60_000),
      });
      const quoteRepository = new QuotePostgresRepository(pool);
      await quoteRepository.save(quote);
      const reloadedQuote = await quoteRepository.findById(quote.id);

      const run = ChatRun.create({
        id: `run-${nanoid(8)}`, quoteId: quote.id, userId: ids.userId, walletId: ids.walletId,
        modelId: quote.modelId, status: 'PENDING', creditsDebited: '0', idempotencyKey: nanoid(),
        createdAt: now, updatedAt: now,
      });
      const runRepository = new RunPostgresRepository(pool);
      await runRepository.save(run);
      const reloadedRun = await runRepository.findById(run.id);

      expect(reloadedQuote?.walletId).toBe(ids.walletId);
      expect(reloadedQuote?.creditPrice.toString()).toBe('0');
      expect(reloadedRun?.walletId).toBe(ids.walletId);
      expect(reloadedRun?.creditsDebited).toBe('0');
    } finally {
      await pool.query('DELETE FROM chat_runs WHERE user_id=$1', [ids.userId]);
      await pool.query('DELETE FROM chat_quotes WHERE user_id=$1', [ids.userId]);
      await deleteWalletFixture(ids);
    }
  });

  it('loads provider deployments and usage windows from canonical pool columns', async () => {
    const adapter = new PoolPostgresAdapter(pool);
    const deployments = await adapter.getEligibleDeployments('deepseek-v4-flash-free', new Date());
    const windows = await adapter.getUsageWindows('scope-zen-free-1');

    expect(deployments.length).toBeGreaterThan(0);
    expect(deployments.every((deployment) => deployment.enabled)).toBe(true);
    expect(windows).toHaveLength(3);
    expect(windows[0]?.limit).toBeGreaterThan(0);
  });

  it('loads the persisted runtime manifest from all canonical tables', async () => {
    const manifest = await loadRuntimeManifest(pool);

    expect(manifest.models).toHaveLength(18);
    expect(manifest.routes).toHaveLength(14);
    expect(manifest.gateways.length).toBeGreaterThan(0);
  });
});

type Fixture = { userId: string; walletId: string };

async function createWalletFixture(balance: bigint): Promise<Fixture> {
  const userId = `u_${nanoid(8)}`;
  const walletId = `w_${nanoid(8)}`;
  await pool.query('INSERT INTO users (id,email) VALUES ($1,$2)', [userId, `${userId}@test.local`]);
  await pool.query('INSERT INTO wallets (id,user_id,balance) VALUES ($1,$2,$3)', [walletId, userId, balance.toString()]);
  return { userId, walletId };
}

async function deleteWalletFixture(ids: Fixture): Promise<void> {
  await pool.query('DELETE FROM wallets WHERE id=$1', [ids.walletId]);
  await pool.query('DELETE FROM users WHERE id=$1', [ids.userId]);
}
