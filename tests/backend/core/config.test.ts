import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findEnvFile, loadEnv, loadSettings } from '../../../backend/src/core/config.js';

describe('loadSettings', () => {
	it('uses the contract defaults', () => {
		const s = loadSettings({});
		expect(s.API_V1_STR).toBe('/api/v1');
		expect(s.APP_HOST).toBe('0.0.0.0');
		expect(s.APP_PORT).toBe(8000);
		expect(s.ACCESS_TOKEN_EXPIRE_MINUTES).toBe(11520);
		expect(s.FRONTEND_HOST).toBe('http://dashboard.localhost');
		expect(s.ENVIRONMENT).toBe('local');
		expect(s.REDIS_HOST).toBe('localhost');
		expect(s.REDIS_PORT).toBe(6379);
		expect(s.POSTGRES_PORT).toBe(5432);
	});

	it('reads APP_PORT and treats empty values as unset', () => {
		expect(loadSettings({ APP_PORT: '8102', REDIS_PASSWORD: '', POSTGRES_PORT: '' }).APP_PORT).toBe(8102);
		expect(loadSettings({ POSTGRES_PORT: '' }).POSTGRES_PORT).toBe(5432);
	});

	it('encodes the database password into the connection URL', () => {
		const s = loadSettings({
			POSTGRES_USER: 'postgres',
			POSTGRES_PASSWORD: 'PG@1234',
			POSTGRES_SERVER: 'localhost',
			POSTGRES_PORT: '5432',
			POSTGRES_DB: 'app'
		});
		expect(s.databaseUrl).toBe('postgresql://postgres:PG%401234@localhost:5432/app');
	});

	it('builds the Redis URL with an optional password', () => {
		expect(loadSettings({ REDIS_HOST: 'redis', REDIS_DB: '2' }).redisUrl).toBe('redis://redis:6379/2');
		expect(loadSettings({ REDIS_PASSWORD: 'p@ss' }).redisUrl).toBe('redis://:p%40ss@localhost:6379/0');
	});

	it('merges BACKEND_CORS_ORIGINS (comma or JSON list) with FRONTEND_HOST', () => {
		const csv = loadSettings({
			BACKEND_CORS_ORIGINS: 'http://a.test/, http://b.test',
			FRONTEND_HOST: 'http://dashboard.test/'
		});
		expect(csv.corsOrigins).toEqual(['http://a.test', 'http://b.test', 'http://dashboard.test']);
		const json = loadSettings({ BACKEND_CORS_ORIGINS: '["http://a.test"]', FRONTEND_HOST: 'http://a.test' });
		expect(json.corsOrigins).toEqual(['http://a.test']);
	});

	it('refuses the changethis placeholders outside local, not in local', () => {
		expect(() => loadSettings({ ENVIRONMENT: 'production', FIRST_SUPERUSER_PASSWORD: 'real-pass' })).toThrow(
			/SECRET_KEY/
		);
		expect(() => loadSettings({ ENVIRONMENT: 'staging', SECRET_KEY: 'real-secret' })).toThrow(
			/FIRST_SUPERUSER_PASSWORD/
		);
		expect(() =>
			loadSettings({ ENVIRONMENT: 'production', SECRET_KEY: 'real-secret', FIRST_SUPERUSER_PASSWORD: 'real-pass' })
		).not.toThrow();
		expect(() => loadSettings({ ENVIRONMENT: 'local' })).not.toThrow();
	});
});

describe('.env lookup', () => {
	it('finds .env in ., .. and ../.. from the working directory; the environment wins', () => {
		const root = mkdtempSync(join(tmpdir(), 'hono-env-'));
		const deep = join(root, 'a', 'b');
		mkdirSync(deep, { recursive: true });
		expect(findEnvFile(deep)).toBeNull();

		writeFileSync(join(root, '.env'), 'APP_PORT=9001\nSECRET_KEY=from-file\nEMPTY=\n');
		expect(findEnvFile(deep)).toBe(join(root, '.env'));
		expect(findEnvFile(join(root, 'a'))).toBe(join(root, '.env'));
		expect(findEnvFile(root)).toBe(join(root, '.env'));

		const env = loadEnv({ SECRET_KEY: 'from-process' }, findEnvFile(deep));
		expect(env.APP_PORT).toBe('9001');
		expect(env.SECRET_KEY).toBe('from-process');
		expect('EMPTY' in env).toBe(false);
	});
});
