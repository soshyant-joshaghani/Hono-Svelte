import { beforeEach, describe, expect, it } from 'vitest';
import { call, makeUser, resetDb, tokenFor } from '../../helpers.js';

type Note = {
	id: string;
	title: string;
	content: string;
	owner_id: string;
	created_at: string;
	updated_at: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const MISSING = '00000000-0000-4000-8000-000000000000';

describe('sample notes', () => {
	let owner: string;
	let other: string;
	let ownerId: string;

	beforeEach(async () => {
		await resetDb();
		ownerId = (await makeUser('owner@example.com')).id;
		await makeUser('other@example.com');
		owner = await tokenFor('owner@example.com');
		other = await tokenFor('other@example.com');
	});

	it('GET /sample is public', async () => {
		const res = await call('GET', '/sample');
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			message: 'Sample module — see /sample/notes for the canonical CRUD example'
		});
	});

	it('needs a token', async () => {
		expect((await call('GET', '/sample/notes')).status).toBe(401);
	});

	it('creates a trimmed NotePublic with 201', async () => {
		const res = await call('POST', '/sample/notes', {
			token: owner,
			json: { title: '  Hello  ', content: '  body  ' }
		});
		expect(res.status).toBe(201);
		const note = (await res.json()) as Note;
		expect(Object.keys(note).sort()).toEqual(
			['content', 'created_at', 'id', 'owner_id', 'title', 'updated_at'].sort()
		);
		expect(note.title).toBe('Hello');
		expect(note.content).toBe('body');
		expect(note.owner_id).toBe(ownerId);
		expect(note.created_at).toMatch(ISO);
		expect(note.updated_at).toMatch(ISO);
	});

	it('content defaults to an empty string', async () => {
		const res = await call('POST', '/sample/notes', { token: owner, json: { title: 'T' } });
		expect(((await res.json()) as Note).content).toBe('');
	});

	it('rejects bad titles with 422 and a string detail', async () => {
		for (const json of [{ title: '   ' }, { title: '' }, { content: 'no title' }, { title: 'x'.repeat(256) }]) {
			const res = await call('POST', '/sample/notes', { token: owner, json });
			expect(res.status).toBe(422);
			expect(typeof ((await res.json()) as { detail: unknown }).detail).toBe('string');
		}
		const blank = await call('POST', '/sample/notes', { token: owner, json: { title: '   ' } });
		expect(await blank.json()).toEqual({ detail: 'Title cannot be empty' });
	});

	it('lists only the caller\'s notes, newest update first', async () => {
		const first = (await (await call('POST', '/sample/notes', { token: owner, json: { title: 'first' } })).json()) as Note;
		await call('POST', '/sample/notes', { token: other, json: { title: 'not mine' } });
		const second = (await (await call('POST', '/sample/notes', { token: owner, json: { title: 'second' } })).json()) as Note;
		await call('PATCH', `/sample/notes/${first.id}`, { token: owner, json: { content: 'edited' } });
		const list = (await (await call('GET', '/sample/notes', { token: owner })).json()) as Note[];
		expect(list.map((n) => n.id)).toEqual([first.id, second.id]);
	});

	it('PATCH trims, keeps untouched fields, and rejects a blank title', async () => {
		const note = (await (await call('POST', '/sample/notes', { token: owner, json: { title: 'T', content: 'body' } })).json()) as Note;
		const res = await call('PATCH', `/sample/notes/${note.id}`, { token: owner, json: { title: '  Renamed  ' } });
		expect(res.status).toBe(200);
		const updated = (await res.json()) as Note;
		expect(updated.title).toBe('Renamed');
		expect(updated.content).toBe('body');
		const blank = await call('PATCH', `/sample/notes/${note.id}`, { token: owner, json: { title: '   ' } });
		expect(blank.status).toBe(422);
	});

	it('other owners get 403 "Not allowed to access this note"; unknown is 404; bad id is 422', async () => {
		const note = (await (await call('POST', '/sample/notes', { token: owner, json: { title: 'T' } })).json()) as Note;
		for (const [method, json] of [
			['GET', undefined],
			['PATCH', { title: 'hijack' }],
			['DELETE', undefined]
		] as const) {
			const res = await call(method, `/sample/notes/${note.id}`, { token: other, json });
			expect(res.status).toBe(403);
			expect(await res.json()).toEqual({ detail: 'Not allowed to access this note' });
		}
		const missing = await call('GET', `/sample/notes/${MISSING}`, { token: owner });
		expect(missing.status).toBe(404);
		expect(await missing.json()).toEqual({ detail: 'Note not found' });
		expect((await call('GET', '/sample/notes/not-a-uuid', { token: owner })).status).toBe(422);
	});

	it('DELETE answers 204 with an empty body, then the note is gone', async () => {
		const note = (await (await call('POST', '/sample/notes', { token: owner, json: { title: 'T' } })).json()) as Note;
		const res = await call('DELETE', `/sample/notes/${note.id}`, { token: owner });
		expect(res.status).toBe(204);
		expect(await res.text()).toBe('');
		expect((await call('GET', `/sample/notes/${note.id}`, { token: owner })).status).toBe(404);
		const list = (await (await call('GET', '/sample/notes', { token: owner })).json()) as Note[];
		expect(list).toEqual([]);
	});
});
