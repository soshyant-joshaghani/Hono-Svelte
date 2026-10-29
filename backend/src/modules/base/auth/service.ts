import type { Token } from '@hono-svelte/contracts';
import { getDb } from '../../../core/db.js';
import { ApiError } from '../../../core/errors.js';
import { readAccessToken, signAccessToken, verifyPassword } from '../../../core/security.js';
import type { UserRow } from '../../../db/schema.js';
import { findUserByEmail, findUserById } from '../users/repository.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function login(username: string, password: string): Promise<Token> {
	const user = await findUserByEmail(getDb(), username);
	if (!user || !(await verifyPassword(password, user.hashedPassword))) {
		throw new ApiError(400, 'Incorrect email or password');
	}
	if (!user.isActive) throw new ApiError(400, 'Inactive user');
	return { access_token: await signAccessToken(user.id), token_type: 'bearer' };
}

/** Resolve the `Authorization: Bearer <jwt>` header to a user. */
export async function authenticate(header: string | undefined): Promise<UserRow> {
	const [scheme, token] = (header ?? '').trim().split(/\s+/, 2);
	if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) throw ApiError.notAuthenticated();

	let userId: string;
	try {
		userId = await readAccessToken(token);
	} catch {
		throw ApiError.invalidCredentials();
	}
	if (!UUID_RE.test(userId)) throw ApiError.invalidCredentials();
	const user = await findUserById(getDb(), userId.toLowerCase());
	if (!user) throw ApiError.invalidCredentials();
	return user;
}
