import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../../../../backend/src/core/db.js';
import { findUserByEmail } from '../../../../backend/src/modules/base/users/repository.js';
import { adminToken, call, loginRequest, makeUser, resetDb, tokenFor } from '../../helpers.js';

const PRIVILEGES = { detail: "The user doesn't have enough privileges" };

describe('users admin', () => {
	let admin: string;

	beforeEach(async () => {
		await resetDb();
		admin = await adminToken();
	});

	it('lists {data, count} ordered by email and honours skip/limit', async () => {
		await makeUser('b@example.com');
		await makeUser('a@example.com');
		const res = await call('GET', '/base/users/admin?skip=0&limit=100', { token: admin });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { data: { email: string }[]; count: number };
		expect(body.count).toBe(3);
		expect(body.data.map((u) => u.email)).toEqual(['a@example.com', 'admin@example.com', 'b@example.com']);

		const page = await call('GET', '/base/users/admin?skip=1&limit=1', { token: admin });
		const paged = (await page.json()) as { data: { email: string }[]; count: number };
		expect(paged.data.map((u) => u.email)).toEqual(['admin@example.com']);
		expect(paged.count).toBe(3);
	});

	it('creates a user with defaults and rejects a duplicate with 400', async () => {
		const res = await call('POST', '/base/users/admin', {
			token: admin,
			json: { email: 'new@example.com', password: 'password123', full_name: 'New' }
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			id: expect.any(String),
			email: 'new@example.com',
			is_active: true,
			is_superuser: false,
			full_name: 'New'
		});
		const dup = await call('POST', '/base/users/admin', {
			token: admin,
			json: { email: 'new@example.com', password: 'password123' }
		});
		expect(dup.status).toBe(400);
		expect(await dup.json()).toEqual({
			detail: 'The user with this email already exists in the system.'
		});
	});

	it('validates the create body with a 422 string detail', async () => {
		const res = await call('POST', '/base/users/admin', {
			token: admin,
			json: { email: 'not-an-email', password: 'short' }
		});
		expect(res.status).toBe(422);
		expect(typeof ((await res.json()) as { detail: unknown }).detail).toBe('string');
	});

	it('gives non-superusers 403 on the superuser routes', async () => {
		const other = await makeUser('plain@example.com');
		const token = await tokenFor('plain@example.com');
		for (const [method, path, json] of [
			['GET', '/base/users/admin', undefined],
			['POST', '/base/users/admin', { email: 'x@example.com', password: 'password123' }],
			['PATCH', `/base/users/${other.id}/admin`, { full_name: 'x' }],
			['DELETE', `/base/users/${other.id}/admin`, undefined]
		] as const) {
			const res = await call(method, path, { token, json });
			expect(res.status).toBe(403);
			expect(await res.json()).toEqual(PRIVILEGES);
		}
	});

	it('GET by id: self is allowed, others need a superuser, unknown is 404', async () => {
		const plain = await makeUser('plain@example.com');
		const other = await makeUser('other@example.com');
		const token = await tokenFor('plain@example.com');
		expect((await call('GET', `/base/users/${plain.id}/admin`, { token })).status).toBe(200);
		const forbidden = await call('GET', `/base/users/${other.id}/admin`, { token });
		expect(forbidden.status).toBe(403);
		expect(await forbidden.json()).toEqual(PRIVILEGES);
		expect((await call('GET', `/base/users/${other.id}/admin`, { token: admin })).status).toBe(200);
		const missing = await call('GET', '/base/users/00000000-0000-4000-8000-000000000000/admin', {
			token: admin
		});
		expect(missing.status).toBe(404);
		expect(await missing.json()).toEqual({ detail: 'User not found' });
		expect((await call('GET', '/base/users/not-a-uuid/admin', { token: admin })).status).toBe(422);
	});

	it('PATCH changes only sent fields and re-hashes the password', async () => {
		const user = await makeUser('edit@example.com', 'password123', { fullName: 'Before' });
		const before = await findUserByEmail(getDb(), 'edit@example.com');

		const rename = await call('PATCH', `/base/users/${user.id}/admin`, {
			token: admin,
			json: { full_name: 'After' }
		});
		expect(rename.status).toBe(200);
		expect(((await rename.json()) as { full_name: string; email: string }).email).toBe('edit@example.com');
		expect((await findUserByEmail(getDb(), 'edit@example.com'))?.hashedPassword).toBe(
			before?.hashedPassword
		);

		const repass = await call('PATCH', `/base/users/${user.id}/admin`, {
			token: admin,
			json: { password: 'new-password-1' }
		});
		expect(repass.status).toBe(200);
		expect((await loginRequest('edit@example.com', 'password123')).status).toBe(400);
		expect((await loginRequest('edit@example.com', 'new-password-1')).status).toBe(200);
	});

	it('PATCH: unknown id is 404, email clash is 409', async () => {
		const a = await makeUser('a@example.com');
		await makeUser('b@example.com');
		const unknown = await call('PATCH', '/base/users/00000000-0000-4000-8000-000000000000/admin', {
			token: admin,
			json: { full_name: 'x' }
		});
		expect(unknown.status).toBe(404);
		expect(await unknown.json()).toEqual({
			detail: 'The user with this id does not exist in the system'
		});
		const clash = await call('PATCH', `/base/users/${a.id}/admin`, {
			token: admin,
			json: { email: 'b@example.com' }
		});
		expect(clash.status).toBe(409);
		expect(await clash.json()).toEqual({ detail: 'User with this email already exists' });
	});

	it('DELETE removes the user and their notes; deleting yourself is 403', async () => {
		const victim = await makeUser('victim@example.com');
		const victimToken = await tokenFor('victim@example.com');
		const note = await call('POST', '/sample/notes', { token: victimToken, json: { title: 'mine' } });
		expect(note.status).toBe(201);

		const res = await call('DELETE', `/base/users/${victim.id}/admin`, { token: admin });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ message: 'User deleted successfully' });
		expect((await loginRequest('victim@example.com', 'password123')).status).toBe(400);

		const me = (await (await call('GET', '/base/login/me', { token: admin })).json()) as { id: string };
		const self = await call('DELETE', `/base/users/${me.id}/admin`, { token: admin });
		expect(self.status).toBe(403);
		expect(await self.json()).toEqual({
			detail: 'Super users are not allowed to delete themselves'
		});

		const gone = await call('DELETE', `/base/users/${victim.id}/admin`, { token: admin });
		expect(gone.status).toBe(404);
		expect(await gone.json()).toEqual({ detail: 'User not found' });
	});
});
