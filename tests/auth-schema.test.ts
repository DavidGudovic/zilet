import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAuthTables } from '@better-auth/core/db';
import * as schema from '../src/db/schema';
test('Drizzle auth fields cover the pinned Better Auth contract', () => {
  const tables = getAuthTables({
    rateLimit: { storage: 'database' },
    user: { additionalFields: { role: { type: 'string' }, suspended: { type: 'boolean' } } },
  });
  for (const [name, table] of Object.entries(tables)) {
    const drizzle = schema[name as keyof typeof schema];
    assert.ok(drizzle, `Missing table ${name}`);
    for (const field of Object.keys(table.fields))
      assert.ok(field in drizzle, `Missing ${name}.${field}`);
  }
});
