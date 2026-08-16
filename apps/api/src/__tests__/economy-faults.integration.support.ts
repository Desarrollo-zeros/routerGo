import type { Pool } from 'pg';
import { nanoid } from 'nanoid';

export async function installOperationInsertFailure(pool: Pool, operationId: string): Promise<() => Promise<void>> {
  const suffix = nanoid(8).replaceAll('-', '');
  const functionName = `t024_fail_${suffix}`;
  const triggerName = `t024_fail_trigger_${suffix}`;
  const escapedOperationId = operationId.replaceAll("'", "''");
  await pool.query(
    `CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
     BEGIN
       IF NEW.operation_id = '${escapedOperationId}' THEN
         RAISE EXCEPTION 'T024 injected operation failure';
       END IF;
       RETURN NEW;
     END; $$`,
  );
  await pool.query(
    `CREATE TRIGGER ${triggerName} BEFORE INSERT ON credit_reservation_operations
     FOR EACH ROW EXECUTE FUNCTION ${functionName}()`,
  );
  return async () => {
    await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON credit_reservation_operations`);
    await pool.query(`DROP FUNCTION IF EXISTS ${functionName}()`);
  };
}
