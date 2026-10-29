import { createRoute } from '@hono/zod-openapi';
import {
	JobAcceptedSchema,
	JobPingQuerySchema,
	MessageSchema,
	PrivateUserCreateSchema,
	UserPublicSchema
} from '@hono-svelte/contracts';
import { ApiError } from '../../core/errors.js';
import { log } from '../../core/logger.js';
import { jobQueue } from '../../core/queue.js';
import { createRouter, errorContent } from '../../http.js';
import * as users from '../base/users/service.js';

const TAG = '[SYSTEM] System - Private';

const pingRoute = createRoute({
	method: 'get',
	path: '/ping',
	tags: [TAG],
	summary: 'Private Ping',
	responses: {
		200: { description: 'Pong', content: { 'application/json': { schema: MessageSchema } } }
	}
});

const createUserRoute = createRoute({
	method: 'post',
	path: '/users',
	tags: [TAG],
	summary: 'Create User',
	request: {
		body: { content: { 'application/json': { schema: PrivateUserCreateSchema } }, required: true }
	},
	responses: {
		200: { description: 'Created user', content: { 'application/json': { schema: UserPublicSchema } } },
		400: { description: 'Email already exists', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const jobRoute = createRoute({
	method: 'post',
	path: '/jobs/ping',
	tags: [TAG],
	summary: 'Enqueue Ping Job',
	request: { query: JobPingQuerySchema },
	responses: {
		200: { description: 'Job queued', content: { 'application/json': { schema: JobAcceptedSchema } } },
		503: { description: 'Redis unavailable', content: errorContent }
	}
});

/** Mounted at `/private`, and only when `ENVIRONMENT=local`. */
export const privateRoutes = createRouter()
	.openapi(pingRoute, (c) => c.json({ message: 'private ok' }, 200))
	.openapi(createUserRoute, async (c) => c.json(await users.createPrivateUser(c.req.valid('json')), 200))
	.openapi(jobRoute, async (c) => {
		const { message } = c.req.valid('query');
		try {
			const jobId = await jobQueue().enqueue('ping', { message });
			log.info('enqueued ping job', { job_id: jobId });
			return c.json({ job_id: jobId, message }, 200);
		} catch (error) {
			const reason = error instanceof Error ? error.message : 'unknown error';
			throw new ApiError(503, `Redis unavailable: ${reason}`);
		}
	});
