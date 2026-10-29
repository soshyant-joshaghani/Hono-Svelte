import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { AppDatabase } from '../../backend/src/core/db.js';
import { setDbForTests } from '../../backend/src/core/db.js';
import { migrationsFolder } from '../../backend/src/db/migrate.js';
import * as schema from '../../backend/src/db/schema.js';

// One in-memory Postgres (PGlite) per test file, built from the real SQL migrations.
// Redis is off (REDIS_DISABLED=1, see backend/vitest.config.ts), so cache calls are no-ops.
const client = new PGlite();
const database = drizzle(client, { schema });
await migrate(database, { migrationsFolder: migrationsFolder() });
setDbForTests(database as unknown as AppDatabase);
