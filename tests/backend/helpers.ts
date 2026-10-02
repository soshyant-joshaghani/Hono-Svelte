import { sql } from 'drizzle-orm';
import { expect } from 'vitest';
import { app } from '../../backend/src/app.js';
import { getDb } from '../../backend/src/core/db.js';
import { hashPassword } from '../../backend/src/core/security.js';
import { insertUser } from '../../backend/src/modules/base/users/repository.js';

export const ADMIN = { email: 'admin@example.com', password: 'adminpass123' };
export const API = '/api/v1';

export async function resetDb() {
	const db = getDb();
	await db.execute(sql`delete from note`);
	await db.execute(sql`delete from "user"`);
}

export async function makeUser(
	email: string,
	password = 'password123',
	options: { superuser?: boolean; active?: boolean; fullName?: string | null } = {}
) {
	return insertUser(getDb(), {
		email,
		hashedPassword: await hashPassword(password),
		isActive: options.active ?? true,
		isSuperuser: options.superuser ?? false,
		fullName: options.fullName ?? null
	});
}

export function loginRequest(username: string, password: string) {
	return app.request(`${API}/base/login/access-token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ username, password }).toString()
	});
}

export async function tokenFor(email: string, password = 'password123') {
	const res = await loginRequest(email, password);
	expect(res.status).toBe(200);
	return ((await res.json()) as { access_token: string }).access_token;
}

export async function adminToken() {
	await makeUser(ADMIN.email, ADMIN.password, { superuser: true });
	return tokenFor(ADMIN.email, ADMIN.password);
}

export function call(
	method: string,
	path: string,
	options: { token?: string; json?: unknown } = {}
) {
	const headers: Record<string, string> = {};
	if (options.token) headers.authorization = `Bearer ${options.token}`;
	let body: string | undefined;
	if (options.json !== undefined) {
		headers['content-type'] = 'application/json';
		body = JSON.stringify(options.json);
	}
	return app.request(`${API}${path}`, { method, headers, body });
}
