import { closeDb } from './core/db.js';
import { migrate } from './db/migrate.js';
import { seed } from './seed.js';

await migrate();
await seed();
await closeDb();
