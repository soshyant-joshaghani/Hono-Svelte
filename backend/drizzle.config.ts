import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

loadDotenv({ path: resolve(import.meta.dirname, '../.env') });

const user = encodeURIComponent(process.env.POSTGRES_USER ?? 'postgres');
const password = encodeURIComponent(process.env.POSTGRES_PASSWORD ?? '');
const host = process.env.POSTGRES_SERVER ?? 'localhost';
const port = process.env.POSTGRES_PORT ?? '5432';
const database = process.env.POSTGRES_DB ?? 'app';

export default defineConfig({
	schema: './src/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: `postgresql://${user}:${password}@${host}:${port}/${database}`
	}
});
