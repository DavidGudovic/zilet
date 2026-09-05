import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
const globalDb = globalThis as unknown as { ziletSql?: ReturnType<typeof postgres> };
export const sql =
  globalDb.ziletSql ||
  postgres(process.env.DATABASE_URL || 'postgres://zilet:invalid@localhost:5433/zilet', {
    max: 10,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
if (process.env.NODE_ENV !== 'production') globalDb.ziletSql = sql;
export const db = drizzle(sql, { schema });
