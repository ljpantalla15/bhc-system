import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

/**
 * Execute a parameterized query against the pool.
 */
export async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run operations within a transaction, setting the current user audit context.
 *
 * @param {object} user - User object with id property (or null/anonymous)
 * @param {function(pg.PoolClient): Promise<any>} fn - Transaction callback
 */
export async function withTransaction(user, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = user && user.id != null ? String(user.id) : '';
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
