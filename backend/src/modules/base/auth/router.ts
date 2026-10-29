import { createRoute } from '@hono/zod-openapi';
import { LoginFormSchema, TokenSchema, UserPublicSchema } from '@hono-svelte/contracts';
import { bearerAuth, createRouter, errorContent } from '../../../http.js';
import { toPublicUser } from '../users/service.js';
import { requireUser } from './deps.js';
import * as auth from './service.js';

const loginRoute = createRoute({
	method: 'post',
	path: '/login/access-token',
	tags: ['[BASE] Auth'],
	summary: 'Login Access Token',
	request: {
		body: {
			content: { 'application/x-www-form-urlencoded': { schema: LoginFormSchema } },
			required: true
		}
	},
	responses: {
		200: {
			description: 'Access token',
			content: { 'application/json': { schema: TokenSchema } }
		},
		400: { description: 'Incorrect email or password / inactive user', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const meRoute = createRoute({
	method: 'get',
	path: '/login/me',
	tags: ['[BASE] Auth'],
	summary: 'Read Users Me',
	security: bearerAuth,
	middleware: [requireUser] as const,
	responses: {
		200: {
			description: 'Current user',
			content: { 'application/json': { schema: UserPublicSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent }
	}
});

export const authRoutes = createRouter()
	.openapi(loginRoute, async (c) => {
		const form = c.req.valid('form');
		return c.json(await auth.login(form.username, form.password), 200);
	})
	.openapi(meRoute, (c) => c.json(toPublicUser(c.get('user')), 200));
