import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../../../http.js';
import { assertSuperuser } from '../users/service.js';
import { authenticate } from './service.js';

/** Route middleware: runs before body validation, so a missing token is 401 before a bad body is 422. */
export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
	c.set('user', await authenticate(c.req.header('Authorization')));
	await next();
});

export const requireSuperuser = createMiddleware<AppEnv>(async (c, next) => {
	const user = await authenticate(c.req.header('Authorization'));
	assertSuperuser(user);
	c.set('user', user);
	await next();
});
