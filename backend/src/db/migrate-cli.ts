import { closeDb } from '../core/db.js';
import { log } from '../core/logger.js';
import { migrate } from './migrate.js';

await migrate();
log.info('migrations complete');
await closeDb();
