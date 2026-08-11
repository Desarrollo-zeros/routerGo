import { describe, it, expect, afterAll } from 'vitest';
import pg from 'pg';
import { nanoid } from 'nanoid';
import { Wallet } from '../domain/entities/Wallet.js';
import { Credits } from '../domain/value-objects/Credits.js';
import { LedgerEntry } from '../domain/entities/LedgerEntry.js';

const DB = process.env.DATABASE_URL ?? 'postgres://routergo:routergo@localhost:5433/routergo';
const pool = new pg.Pool({ connectionString: DB, max: 20 });

async function createWallet(initial: bigint): Promise<{ userId: string; walletId: string }> {
  const userId = `u_${nanoid(8)}`;
  const walletId = `w_${nanoid(8)}`;
  const c = await pool.connect();
  try {
    await c.query('INSERT INTO users (id,email) VALUES ($1,$2)', [userId, `${userId}@t.local`]);
    await c.query('INSERT INTO wallets (id,user_id,balance,version) VALUES ($1,$2,$3,0)', [walletId, userId, initial.toString()]);
    if (initial > 0n) {
      await c.query("INSERT INTO ledger_entries (id,wallet_id,type,amount_signed,idempotency_key) VALUES ($1,$2,'EARN',$3,$4)", [`le_${nanoid(6)}`, walletId, initial.toString(), `init_${walletId}`]);
    }
    // domain sanity: ensure Wallet/Credits/LedgerEntry work and no hardcoded models
    const w = Wallet.create({ id: walletId, userId, balance: Credits.of(initial), version: 0, createdAt: new Date(), updatedAt: new Date() });
    LedgerEntry.create({ id: `le_${nanoid(6)}`, walletId: w.id, kind: 'earn', amount: Credits.of(1n), idempotencyKey: `k_${nanoid(4)}`, refId: null, createdAt: new Date() });
    return { userId, walletId };
  } finally { c.release(); }
}
async function cleanup(userId: string, walletId: string): Promise<void> {
  await pool.query('DELETE FROM ledger_entries WHERE wallet_id=$1', [walletId]);
  await pool.query('DELETE FROM wallets WHERE id=$1', [walletId]);
  await pool.query('DELETE FROM users WHERE id=$1', [userId]);
}
async function sumLedger(walletId: string): Promise<bigint> {
  const r = await pool.query('SELECT COALESCE(SUM(amount_signed),0) as s FROM ledger_entries WHERE wallet_id=$1', [walletId]);
  return BigInt(r.rows[0].s);
}
async function getBalance(walletId: string): Promise<bigint> {
  const r = await pool.query('SELECT balance FROM wallets WHERE id=$1', [walletId]);
  return BigInt(r.rows[0].balance);
}
async function txEarn(walletId: string, amount: bigint, key: string): Promise<boolean> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const ex = await c.query('SELECT 1 FROM ledger_entries WHERE wallet_id=$1 AND idempotency_key=$2', [walletId, key]);
    if (ex.rowCount) { await c.query('COMMIT'); return false; }
    await c.query('SELECT balance FROM wallets WHERE id=$1 FOR UPDATE', [walletId]);
    await c.query("INSERT INTO ledger_entries (id,wallet_id,type,amount_signed,idempotency_key) VALUES ($1,$2,'EARN',$3,$4)", [nanoid(), walletId, amount.toString(), key]);
    await c.query('UPDATE wallets SET balance=balance+$2, version=version+1, updated_at=now() WHERE id=$1', [walletId, amount.toString()]);
    await c.query('COMMIT'); return true;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
async function txSpend(walletId: string, amount: bigint, key: string): Promise<boolean> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const ex = await c.query('SELECT 1 FROM ledger_entries WHERE wallet_id=$1 AND idempotency_key=$2', [walletId, key]);
    if (ex.rowCount) { await c.query('COMMIT'); return false; }
    const r = await c.query('SELECT balance FROM wallets WHERE id=$1 FOR UPDATE', [walletId]);
    const bal = BigInt(r.rows[0].balance);
    if (bal < amount) { await c.query('ROLLBACK'); throw new Error('InsufficientBalance'); }
    await c.query("INSERT INTO ledger_entries (id,wallet_id,type,amount_signed,idempotency_key) VALUES ($1,$2,'SPEND',$3,$4)", [nanoid(), walletId, (-amount).toString(), key]);
    await c.query('UPDATE wallets SET balance=balance-$2, version=version+1, updated_at=now() WHERE id=$1', [walletId, amount.toString()]);
    await c.query('COMMIT'); return true;
  } catch (e) { try { await c.query('ROLLBACK'); } catch {} throw e; } finally { c.release(); }
}

afterAll(async () => { await pool.end(); });

describe('wallet/ledger concurrency (pg real)', () => {
  it('CHECK balance>=0 prevents negative', async () => {
    const { userId, walletId } = await createWallet(100n);
    try {
      await expect(pool.query('UPDATE wallets SET balance=-1 WHERE id=$1', [walletId])).rejects.toThrow();
      const bal = await getBalance(walletId);
      expect(bal >= 0n).toBe(true);
      // domain also rejects negative
      expect(() => Wallet.create({ id: 'x', userId: 'y', balance: Credits.of(-1n), version: 0, createdAt: new Date(), updatedAt: new Date() })).toThrow();
    } finally { await cleanup(userId, walletId); }
  });

  it('SUM(ledger)=balance invariant', async () => {
    const { userId, walletId } = await createWallet(0n);
    try {
      await txEarn(walletId, 400n, `k_${nanoid()}`);
      await txEarn(walletId, 600n, `k_${nanoid()}`);
      await txSpend(walletId, 250n, `k_${nanoid()}`);
      const bal = await getBalance(walletId);
      const sum = await sumLedger(walletId);
      expect(bal).toBe(sum);
      expect(bal).toBe(750n);
    } finally { await cleanup(userId, walletId); }
  });

  it('UNIQUE(wallet_id,idempotency_key) idempotency re-exec without duplicate', async () => {
    const { userId, walletId } = await createWallet(500n);
    try {
      const key = `idem_${nanoid()}`;
      const first = await txEarn(walletId, 100n, key);
      expect(first).toBe(true);
      const bal1 = await getBalance(walletId);
      const second = await txEarn(walletId, 100n, key);
      expect(second).toBe(false);
      const bal2 = await getBalance(walletId);
      expect(bal2).toBe(bal1);
      const cnt = await pool.query('SELECT count(*) FROM ledger_entries WHERE wallet_id=$1 AND idempotency_key=$2', [walletId, key]);
      expect(Number(cnt.rows[0].count)).toBe(1);
      // raw conflict also blocked
      const r = await pool.query("INSERT INTO ledger_entries (id,wallet_id,type,amount_signed,idempotency_key) VALUES ($1,$2,'EARN',100,$3) ON CONFLICT (wallet_id,idempotency_key) DO NOTHING", [nanoid(), walletId, key]);
      expect(r.rowCount).toBe(0);
    } finally { await cleanup(userId, walletId); }
  });

  it('200 workers concurrent earn/spend without double-spend via Promise.all', async () => {
    const { userId, walletId } = await createWallet(5000n);
    try {
      const earns = Array.from({ length: 100 }, (_, i) => txEarn(walletId, 30n, `earn_${i}_${nanoid(4)}`));
      const spends = Array.from({ length: 100 }, (_, i) => txSpend(walletId, 20n, `spend_${i}_${nanoid(4)}`));
      const all = [...earns, ...spends];
      // shuffle to intermix earn/spend
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      const results = await Promise.allSettled(all);
      const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
      expect(fulfilled).toBe(200);
      const bal = await getBalance(walletId);
      expect(bal >= 0n).toBe(true);
      expect(bal).toBe(6000n);
      const sum = await sumLedger(walletId);
      expect(sum).toBe(bal);
      const cnt = await pool.query('SELECT count(*) FROM ledger_entries WHERE wallet_id=$1', [walletId]);
      expect(Number(cnt.rows[0].count)).toBe(201); // 1 init + 200
    } finally { await cleanup(userId, walletId); }
  }, 30000);
});
