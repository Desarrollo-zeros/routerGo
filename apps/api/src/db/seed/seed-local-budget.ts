import type pg from 'pg';

const LOCAL_BUDGET_ID = 'budget-routergo-local-dev';
const LOCAL_LIMIT_MICROUSD = 1_000_000;

export async function seedLocalBudget(client: pg.PoolClient): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;
  await client.query(
    `INSERT INTO economy_budgets(id,scope_type,amount_unit,limit_amount,currency_code,starts_at,ends_at)
     VALUES ($1,'GLOBAL','USD_MICRO',$2,'USD','2026-01-01T00:00:00Z','2099-01-01T00:00:00Z')
     ON CONFLICT (id) DO UPDATE SET limit_amount=EXCLUDED.limit_amount, starts_at=EXCLUDED.starts_at, ends_at=EXCLUDED.ends_at`,
    [LOCAL_BUDGET_ID, LOCAL_LIMIT_MICROUSD],
  );
}
