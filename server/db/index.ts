import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from './schema';

declare global {
  var _postgresPool: pg.Pool | undefined;
}

export function isPostgresConfigured(): boolean {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return true;
  }
  if (process.env.SQL_HOST && process.env.SQL_DB_NAME && process.env.SQL_USER) {
    return true;
  }
  return false;
}

export const createPool = (): pg.Pool | null => {
  if (!isPostgresConfigured()) {
    return null;
  }

  if (!global._postgresPool) {
    let poolConfig: pg.PoolConfig;

    if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
      poolConfig = {
        connectionString: process.env.DATABASE_URL.trim(),
        max: 10,
        connectionTimeoutMillis: 10000,
        ssl: process.env.DATABASE_URL.includes('sslmode=require') || process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined
      };
    } else {
      poolConfig = {
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 10000
      };
    }

    const pool = new Pool(poolConfig);

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err);
    });

    global._postgresPool = pool;
  }

  return global._postgresPool;
};

const pool = createPool();
export const db = pool ? drizzle(pool, { schema }) : null;
