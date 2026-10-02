import { migrate as runMigrations } from 'drizzle-orm/postgres-js/migrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../core/db.js';
import { log } from '../core/logger.js';

export function migrationsFolder() {
	return resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');
}

export async function migrate() {
	const folder = migrationsFolder();
	log.info('applying migrations', { folder });
	await runMigrations(getDb(), { migrationsFolder: folder });
}
