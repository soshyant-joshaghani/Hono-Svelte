import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../../../backend/src/app.js';
import { setJobQueueForTests, type JobQueue } from '../../../backend/src/core/queue.js';
import { call, resetDb } from '../helpers.js';

describe('system', () => {
	beforeEach(resetDb);
	afterEach(() => setJobQueueForTests(null));

	it('health-check is true', async () => {
		const res = await call('GET', '/utils/health-check');
		expect(res.status).toBe(200);
		expect(await res.json()).toBe(true);
	});

	it('serves /docs, /sdoc and /api/v1/openapi.json', async () => {
		expect((await app.request('/docs')).status).toBe(200);
		expect((await app.request('/sdoc')).status).toBe(200);
		const spec = await app.request('/api/v1/openapi.json');
		expect(spec.status).toBe(200);
		const body = (await spec.json()) as {
			paths: Record<string, unknown>;
			components: { securitySchemes: Record<string, { type: string }> };
		};
		expect(Object.keys(body.paths)).toEqual(
			expect.arrayContaining([
				'/api/v1/base/login/access-token',
				'/api/v1/base/users/admin',
				'/api/v1/base/users/{id}/admin',
				'/api/v1/sample/notes/{id}'
			])
		);
		expect(body.components.securitySchemes.OAuth2PasswordBearer.type).toBe('oauth2');
	});

	it('unknown paths are {"detail":"Not Found"}', async () => {
		const res = await app.request('/nope');
		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ detail: 'Not Found' });
	});

	it('CORS allows the configured origins with credentials', async () => {
		const res = await app.request('/api/v1/utils/health-check', {
			headers: { origin: 'http://localhost:5000' }
		});
		expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5000');
		expect(res.headers.get('access-control-allow-credentials')).toBe('true');
		const frontend = await app.request('/api/v1/utils/health-check', {
			headers: { origin: 'http://dashboard.localhost' }
		});
		expect(frontend.headers.get('access-control-allow-origin')).toBe('http://dashboard.localhost');
	});
});

describe('private routes (ENVIRONMENT=local)', () => {
	beforeEach(resetDb);
	afterEach(() => setJobQueueForTests(null));

	it('GET /private/ping', async () => {
		const res = await call('GET', '/private/ping');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ message: 'private ok' });
	});

	it('POST /private/users creates a user and rejects a duplicate with 400', async () => {
		const body = { email: 'p@example.com', password: 'password123', full_name: 'P' };
		const res = await call('POST', '/private/users', { json: body });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			id: expect.any(String),
			email: 'p@example.com',
			is_active: true,
			is_superuser: false,
			full_name: 'P'
		});
		expect((await call('POST', '/private/users', { json: body })).status).toBe(400);
		expect((await call('POST', '/private/users', { json: { ...body, password: 'short' } })).status).toBe(422);
	});

	it('POST /private/jobs/ping enqueues a ping task and returns {job_id, message}', async () => {
		const jobs: { task: string; args: Record<string, unknown> }[] = [];
		const queue: JobQueue = {
			async enqueue(task, args) {
				jobs.push({ task, args });
				return 'job-1';
			}
		};
		setJobQueueForTests(queue);
		const res = await call('POST', '/private/jobs/ping?message=hello');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ job_id: 'job-1', message: 'hello' });
		expect(jobs).toEqual([{ task: 'ping', args: { message: 'hello' } }]);

		await call('POST', '/private/jobs/ping');
		expect(jobs[1]?.args).toEqual({ message: 'ping' });
	});

	it('POST /private/jobs/ping is 503 "Redis unavailable: ..." when the queue fails', async () => {
		setJobQueueForTests({
			async enqueue() {
				throw new Error('connect ECONNREFUSED');
			}
		});
		const res = await call('POST', '/private/jobs/ping');
		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ detail: 'Redis unavailable: connect ECONNREFUSED' });
	});

	it('with Redis disabled the real queue answers 503', async () => {
		const res = await call('POST', '/private/jobs/ping');
		expect(res.status).toBe(503);
		expect(((await res.json()) as { detail: string }).detail).toMatch(/^Redis unavailable: /);
	});
});

describe('private routes outside local', () => {
	it('are not mounted', async () => {
		vi.resetModules();
		vi.stubEnv('ENVIRONMENT', 'production');
		vi.stubEnv('SECRET_KEY', 'a-real-secret');
		vi.stubEnv('FIRST_SUPERUSER_PASSWORD', 'a-real-password');
		try {
			const { app: prod } = await import('../../../backend/src/app.js');
			expect((await prod.request('/api/v1/private/ping')).status).toBe(404);
			expect((await prod.request('/api/v1/utils/health-check')).status).toBe(200);
		} finally {
			vi.unstubAllEnvs();
			vi.resetModules();
		}
	});
});
