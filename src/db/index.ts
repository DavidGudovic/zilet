import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
const globalDb = globalThis as unknown as { ziletSql?: ReturnType<typeof postgres> };
export const sql =
  globalDb.ziletSql ||
  postgres(process.env.DATABASE_URL || 'postgres://zilet:invalid@localhost:5433/zilet', {
    max: 10,
    prepare: false,
    // Idle connections stay open, so the first reader after a quiet spell does not wait for new
    // connections and their SCRAM handshakes; postgres.js still replaces each after 30–60 min.
    idle_timeout: 0,
    connect_timeout: 10,
  });
if (process.env.NODE_ENV !== 'production') globalDb.ziletSql = sql;
export const db = drizzle(sql, { schema });
