import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { settings } from './config.js';
import * as schema from '../db/schema.js';

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let database: AppDatabase | null = null;
let client: ReturnType<typeof postgres> | null = null;
let override: AppDatabase | null = null;

export function getDb(): AppDatabase {
	if (override) return override;
	if (!database || !client) {
		client = postgres(settings.databaseUrl, { max: 10 });
		database = drizzle(client, { schema });
	}
	return database;
}

/** Test hook. Pass null to restore the real connection. */
export function setDbForTests(next: AppDatabase | null) {
	override = next;
}

export async function closeDb() {
	await client?.end({ timeout: 5 });
	client = null;
	database = null;
}
