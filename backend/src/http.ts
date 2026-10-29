import { OpenAPIHono } from '@hono/zod-openapi';
import { DetailSchema } from '@hono-svelte/contracts';
import type { UserRow } from './db/schema.js';

/** Hono env: the auth middleware stores the caller here. */
export type AppEnv = { Variables: { user: UserRow } };

/** Zod issues -> one `detail` string. */
export function zodMessage(error: { issues: { path: PropertyKey[]; message: string }[] }) {
	const message = error.issues
		.map((issue) => {
			const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
			return `${path}${issue.message}`;
		})
		.join('; ');
	return message || 'Invalid request';
}

/** Router whose validation failures are `422 {"detail": "..."}`. */
export function createRouter() {
	return new OpenAPIHono<AppEnv>({
		defaultHook: (result, c) => {
			if (!result.success) {
				return c.json({ detail: zodMessage(result.error) }, 422);
			}
		}
	});
}

export const errorContent = {
	'application/json': {
		schema: DetailSchema
	}
} as const;

/** OpenAPI security scheme name (same as Fast, so Scalar and Swagger show the same Authorize box). */
export const SECURITY_SCHEME = 'OAuth2PasswordBearer';
export const bearerAuth = [{ [SECURITY_SCHEME]: [] }];
