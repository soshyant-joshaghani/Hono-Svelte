import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for core/redis.ts that records keys and TTLs.
const store = vi.hoisted(() => new Map<string, { value: unknown; ttl: number }>());

vi.mock('../../../../backend/src/core/redis.js', () => ({
	redisDisabled: () => false,
	redisReachable: async () => true,
	closeRedis: async () => undefined,
	cacheGet: async (key: string) => (store.has(key) ? structuredClone(store.get(key)!.value) : null),
	cacheSet: async (key: string, value: unknown, ttl: number) => {
		store.set(key, { value: structuredClone(value), ttl });
	},
	cacheDelete: async (key: string) => {
		store.delete(key);
	},
	cacheDeletePrefix: async (prefix: string) => {
		for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
	}
}));

const { call, makeUser, resetDb, tokenFor } = await import('../../helpers.js');

type Note = { id: string; owner_id: string; title: string };

describe('sample notes cache (Redis keys and TTLs)', () => {
	let token: string;
	let ownerId: string;

	beforeEach(async () => {
		store.clear();
		await resetDb();
		ownerId = (await makeUser('owner@example.com')).id;
		token = await tokenFor('owner@example.com');
	});

	it('create sets note:<owner>:<id> (300 s) and drops the list key', async () => {
		await call('GET', '/sample/notes', { token });
		expect(store.get(`sample:notes:v1:list:${ownerId}`)?.ttl).toBe(120);

		const note = (await (await call('POST', '/sample/notes', { token, json: { title: 'T' } })).json()) as Note;
		expect(store.has(`sample:notes:v1:list:${ownerId}`)).toBe(false);
		expect(store.get(`sample:notes:v1:note:${ownerId}:${note.id}`)?.ttl).toBe(300);
	});

	it('list and get read through the cache', async () => {
		const note = (await (await call('POST', '/sample/notes', { token, json: { title: 'T' } })).json()) as Note;
		const list = (await (await call('GET', '/sample/notes', { token })).json()) as Note[];
		expect(list.map((n) => n.id)).toEqual([note.id]);
		expect(store.has(`sample:notes:v1:list:${ownerId}`)).toBe(true);

		// A poisoned cache entry is served as is: reads do not touch Postgres when cached.
		store.set(`sample:notes:v1:note:${ownerId}:${note.id}`, {
			value: { ...note, title: 'from cache' },
			ttl: 300
		});
		const got = (await (await call('GET', `/sample/notes/${note.id}`, { token })).json()) as Note;
		expect(got.title).toBe('from cache');
	});

	it('update loads from Postgres (not the cache) and refreshes the keys', async () => {
		const note = (await (await call('POST', '/sample/notes', { token, json: { title: 'T' } })).json()) as Note;
		store.set(`sample:notes:v1:note:${ownerId}:${note.id}`, {
			value: { ...note, title: 'stale' },
			ttl: 300
		});
		await call('GET', '/sample/notes', { token });
		const res = await call('PATCH', `/sample/notes/${note.id}`, { token, json: { title: 'New' } });
		expect(((await res.json()) as Note).title).toBe('New');
		expect(store.has(`sample:notes:v1:list:${ownerId}`)).toBe(false);
		expect((store.get(`sample:notes:v1:note:${ownerId}:${note.id}`)?.value as Note).title).toBe('New');
	});

	it('delete removes every key under the owner', async () => {
		const note = (await (await call('POST', '/sample/notes', { token, json: { title: 'T' } })).json()) as Note;
		await call('GET', '/sample/notes', { token });
		expect((await call('DELETE', `/sample/notes/${note.id}`, { token })).status).toBe(204);
		expect([...store.keys()].filter((key) => key.includes(ownerId))).toEqual([]);
	});
});
