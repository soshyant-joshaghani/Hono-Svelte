import { parse as parseDotenv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const PLACEHOLDER = 'changethis';

const EnvSchema = z.object({
	API_V1_STR: z.string().default('/api/v1'),
	SECRET_KEY: z.string().default(PLACEHOLDER),
	ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(60 * 24 * 8),
	FRONTEND_HOST: z.string().default('http://dashboard.localhost'),
	ENVIRONMENT: z.enum(['local', 'staging', 'production']).default('local'),
	BACKEND_CORS_ORIGINS: z.string().default(''),
	PROJECT_NAME: z.string().default('hono-svelte'),
	POSTGRES_SERVER: z.string().default('localhost'),
	POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
	POSTGRES_USER: z.string().default('postgres'),
	POSTGRES_PASSWORD: z.string().default(''),
	POSTGRES_DB: z.string().default(''),
	REDIS_HOST: z.string().default('localhost'),
	REDIS_PORT: z.coerce.number().int().positive().default(6379),
	REDIS_DB: z.coerce.number().int().min(0).default(0),
	REDIS_PASSWORD: z.string().default(''),
	FIRST_SUPERUSER: z.string().default('admin@example.com'),
	FIRST_SUPERUSER_PASSWORD: z.string().default(PLACEHOLDER),
	APP_HOST: z.string().default('0.0.0.0'),
	APP_PORT: z.coerce.number().int().positive().default(8000),
	BCRYPT_COST: z.coerce.number().int().min(4).max(16).default(12)
});

export type Settings = z.infer<typeof EnvSchema> & {
	databaseUrl: string;
	redisUrl: string;
	corsOrigins: string[];
};

/** `.env` is looked up in `.`, `..`, `../..` from the working directory; the first one found is used. */
export function findEnvFile(cwd: string = process.cwd()): string | null {
	for (const dir of ['.', '..', '../..']) {
		const candidate = resolve(cwd, dir, '.env');
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

/** Process environment over `.env`. Empty values count as unset. */
export function loadEnv(
	env: NodeJS.ProcessEnv = process.env,
	envFile: string | null = findEnvFile()
): Record<string, string> {
	const fromFile = envFile ? parseDotenv(readFileSync(envFile)) : {};
	const merged: Record<string, string | undefined> = { ...fromFile, ...env };
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(merged)) {
		if (value !== undefined && value !== '') out[key] = value;
	}
	return out;
}

function parseCors(raw: string): string[] {
	const text = raw.trim();
	let items: string[] = [];
	if (text.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(text);
			if (Array.isArray(parsed)) items = parsed.map(String);
		} catch {
			items = [];
		}
	} else {
		items = text.split(',');
	}
	return items.map((item) => item.trim().replace(/\/$/, '')).filter(Boolean);
}

/** Build settings from an env map. Outside `local`, the `changethis` placeholders are refused. */
export function loadSettings(env: Record<string, string | undefined> = loadEnv()): Settings {
	const clean: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (value !== undefined && value !== '') clean[key] = value;
	}
	const parsed = EnvSchema.parse(clean);
	if (parsed.ENVIRONMENT !== 'local') {
		if (parsed.SECRET_KEY === PLACEHOLDER) {
			throw new Error('SECRET_KEY must be set (not "changethis") when ENVIRONMENT is not local');
		}
		if (parsed.FIRST_SUPERUSER_PASSWORD === PLACEHOLDER) {
			throw new Error(
				'FIRST_SUPERUSER_PASSWORD must be set (not "changethis") when ENVIRONMENT is not local'
			);
		}
	}

	const user = encodeURIComponent(parsed.POSTGRES_USER);
	const password = encodeURIComponent(parsed.POSTGRES_PASSWORD);
	const databaseUrl = `postgresql://${user}:${password}@${parsed.POSTGRES_SERVER}:${parsed.POSTGRES_PORT}/${parsed.POSTGRES_DB}`;
	const redisAuth = parsed.REDIS_PASSWORD ? `:${encodeURIComponent(parsed.REDIS_PASSWORD)}@` : '';
	const redisUrl = `redis://${redisAuth}${parsed.REDIS_HOST}:${parsed.REDIS_PORT}/${parsed.REDIS_DB}`;
	const corsOrigins = parseCors(parsed.BACKEND_CORS_ORIGINS);
	const frontend = parsed.FRONTEND_HOST.trim().replace(/\/$/, '');
	if (frontend && !corsOrigins.includes(frontend)) corsOrigins.push(frontend);

	return { ...parsed, FRONTEND_HOST: frontend, databaseUrl, redisUrl, corsOrigins };
}

export const settings = loadSettings();
