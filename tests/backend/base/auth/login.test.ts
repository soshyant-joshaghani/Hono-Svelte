import { decodeJwt, decodeProtectedHeader } from 'jose';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../../../../backend/src/core/db.js';
import { findUserByEmail } from '../../../../backend/src/modules/base/users/repository.js';
import { app } from '../../../../backend/src/app.js';
import { ADMIN, API, adminToken, call, loginRequest, makeUser, resetDb, tokenFor } from '../../helpers.js';

describe('login', () => {
	beforeEach(resetDb);

	it('returns {access_token, token_type} for a form login', async () => {
		await makeUser(ADMIN.email, ADMIN.password, { superuser: true });
		const res = await loginRequest(ADMIN.email, ADMIN.password);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { access_token: string; token_type: string };
		expect(body.token_type).toBe('bearer');
		const header = decodeProtectedHeader(body.access_token);
		const claims = decodeJwt(body.access_token);
		expect(header.alg).toBe('HS256');
		expect(claims.sub).toMatch(/^[0-9a-f-]{36}$/);
		// default lifetime is 11520 minutes (8 days)
		expect(claims.exp! - Math.floor(Date.now() / 1000)).toBeGreaterThan(11520 * 60 - 60);
	});

	it('answers 400 "Incorrect email or password" for a wrong password or unknown email', async () => {
		await makeUser('a@example.com', 'password123');
		for (const [user, password] of [
			['a@example.com', 'wrong-password'],
			['nobody@example.com', 'password123']
		]) {
			const res = await loginRequest(user, password);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ detail: 'Incorrect email or password' });
		}
	});

	it('answers 400 "Inactive user" for a correct password on an inactive user', async () => {
		await makeUser('off@example.com', 'password123', { active: false });
		const res = await loginRequest('off@example.com', 'password123');
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ detail: 'Inactive user' });
	});

	it('rejects a JSON body and a missing field with 422 and a string detail', async () => {
		const json = await call('POST', '/base/login/access-token', {
			json: { username: 'a@example.com', password: 'password123' }
		});
		expect(json.status).toBe(422);
		expect(typeof ((await json.json()) as { detail: unknown }).detail).toBe('string');

		const missing = await app.request(`${API}/base/login/access-token`, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: 'username=a%40example.com'
		});
		expect(missing.status).toBe(422);
	});

	it('stores passwords as bcrypt $2b$ hashes', async () => {
		await makeUser('hash@example.com', 'password123');
		const row = await findUserByEmail(getDb(), 'hash@example.com');
		expect(row?.hashedPassword).toMatch(/^\$2b\$\d{2}\$/);
	});
});

describe('bearer auth', () => {
	beforeEach(resetDb);

	it('GET /base/login/me returns UserPublic in snake_case', async () => {
		const token = await adminToken();
		const res = await call('GET', '/base/login/me', { token });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			id: expect.stringMatching(/^[0-9a-f-]{36}$/),
			email: ADMIN.email,
			is_active: true,
			is_superuser: true,
			full_name: null
		});
	});

	it('missing header is 401 "Not authenticated" with WWW-Authenticate', async () => {
		const res = await call('GET', '/base/login/me');
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ detail: 'Not authenticated' });
		expect(res.headers.get('www-authenticate')).toBe('Bearer');
	});

	it('bad token is 401 "Could not validate credentials" with WWW-Authenticate', async () => {
		const res = await call('GET', '/base/login/me', { token: 'not-a-jwt' });
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ detail: 'Could not validate credentials' });
		expect(res.headers.get('www-authenticate')).toBe('Bearer');
	});

	it('a valid token for a deleted user is 401', async () => {
		const admin = await adminToken();
		const user = await makeUser('gone@example.com');
		const token = await tokenFor('gone@example.com');
		expect((await call('DELETE', `/base/users/${user.id}/admin`, { token: admin })).status).toBe(200);
		const res = await call('GET', '/base/login/me', { token });
		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ detail: 'Could not validate credentials' });
	});

	it('checks the token before the body (401, not 422)', async () => {
		const res = await call('POST', '/sample/notes', { json: {} });
		expect(res.status).toBe(401);
	});
});
