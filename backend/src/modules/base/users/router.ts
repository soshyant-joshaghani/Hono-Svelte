import { createRoute, z } from '@hono/zod-openapi';
import {
	MessageSchema,
	UserCreateSchema,
	UserListQuerySchema,
	UserPublicSchema,
	UsersPublicSchema,
	UserUpdateSchema
} from '@hono-svelte/contracts';
import { bearerAuth, createRouter, errorContent } from '../../../http.js';
import { requireSuperuser, requireUser } from '../auth/deps.js';
import * as users from './service.js';

const TAG = '[SUPERADMIN] Core - User Management';
const idParams = z.object({ id: z.string().uuid() });

const listRoute = createRoute({
	method: 'get',
	path: '/users/admin',
	tags: [TAG],
	summary: 'Read Users',
	security: bearerAuth,
	middleware: [requireSuperuser] as const,
	request: { query: UserListQuerySchema },
	responses: {
		200: {
			description: 'Users ordered by email',
			content: { 'application/json': { schema: UsersPublicSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Superuser required', content: errorContent }
	}
});

const createRouteDef = createRoute({
	method: 'post',
	path: '/users/admin',
	tags: [TAG],
	summary: 'Create User',
	security: bearerAuth,
	middleware: [requireSuperuser] as const,
	request: {
		body: { content: { 'application/json': { schema: UserCreateSchema } }, required: true }
	},
	responses: {
		200: {
			description: 'Created user',
			content: { 'application/json': { schema: UserPublicSchema } }
		},
		400: { description: 'Email already exists', content: errorContent },
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Superuser required', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const readRoute = createRoute({
	method: 'get',
	path: '/users/{id}/admin',
	tags: [TAG],
	summary: 'Read User By Id',
	security: bearerAuth,
	middleware: [requireUser] as const,
	request: { params: idParams },
	responses: {
		200: {
			description: 'User',
			content: { 'application/json': { schema: UserPublicSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Not enough privileges', content: errorContent },
		404: { description: 'User not found', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const updateRoute = createRoute({
	method: 'patch',
	path: '/users/{id}/admin',
	tags: [TAG],
	summary: 'Update User',
	security: bearerAuth,
	middleware: [requireSuperuser] as const,
	request: {
		params: idParams,
		body: { content: { 'application/json': { schema: UserUpdateSchema } }, required: true }
	},
	responses: {
		200: {
			description: 'Updated user',
			content: { 'application/json': { schema: UserPublicSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Superuser required', content: errorContent },
		404: { description: 'User not found', content: errorContent },
		409: { description: 'Email already used', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

const deleteRoute = createRoute({
	method: 'delete',
	path: '/users/{id}/admin',
	tags: [TAG],
	summary: 'Delete User',
	security: bearerAuth,
	middleware: [requireSuperuser] as const,
	request: { params: idParams },
	responses: {
		200: {
			description: 'User deleted',
			content: { 'application/json': { schema: MessageSchema } }
		},
		401: { description: 'Not authenticated', content: errorContent },
		403: { description: 'Superuser required / cannot delete self', content: errorContent },
		404: { description: 'User not found', content: errorContent },
		422: { description: 'Invalid request', content: errorContent }
	}
});

export const userRoutes = createRouter()
	.openapi(listRoute, async (c) => {
		const { skip, limit } = c.req.valid('query');
		return c.json(await users.listUsers(skip, limit), 200);
	})
	.openapi(createRouteDef, async (c) => c.json(await users.createUser(c.req.valid('json')), 200))
	.openapi(readRoute, async (c) =>
		c.json(await users.readUser(c.get('user'), c.req.valid('param').id), 200)
	)
	.openapi(updateRoute, async (c) =>
		c.json(await users.updateUser(c.req.valid('param').id, c.req.valid('json')), 200)
	)
	.openapi(deleteRoute, async (c) =>
		c.json(await users.deleteUser(c.get('user'), c.req.valid('param').id), 200)
	);
