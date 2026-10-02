import { createRoute, z } from '@hono/zod-openapi';
import { createRouter } from '../../http.js';

const healthRoute = createRoute({
	method: 'get',
	path: '/health-check',
	tags: ['[SYSTEM] System - Utils'],
	summary: 'Health Check',
	responses: {
		200: {
			description: 'Always true while the process is up',
			content: { 'application/json': { schema: z.boolean() } }
		}
	}
});

/** Mounted at `/utils`. */
export const systemRoutes = createRouter().openapi(healthRoute, (c) => c.json(true, 200));
