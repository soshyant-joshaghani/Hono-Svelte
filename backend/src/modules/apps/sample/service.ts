import type { NoteCreate, NotePublic, NoteUpdate } from '@hono-svelte/contracts';
import { getDb } from '../../../core/db.js';
import { ApiError } from '../../../core/errors.js';
import { cacheDelete, cacheDeletePrefix, cacheGet, cacheSet } from '../../../core/redis.js';
import type { NoteRow, UserRow } from '../../../db/schema.js';
import * as repository from './repository.js';

// Redis read-cache, soft-degrading (CONTRACT.md, Cache): list and get read through it,
// create/update/delete invalidate it, update and delete always load from Postgres.
const PREFIX = 'sample:notes:v1:';
const TTL_LIST = 120;
const TTL_NOTE = 300;

const listKey = (userId: string) => `${PREFIX}list:${userId}`;
const noteKey = (userId: string, noteId: string) => `${PREFIX}note:${userId}:${noteId}`;

async function invalidateOwner(userId: string) {
	await cacheDeletePrefix(`${PREFIX}list:${userId}`);
	await cacheDeletePrefix(`${PREFIX}note:${userId}:`);
}

function toPublic(note: NoteRow): NotePublic {
	return {
		id: note.id,
		title: note.title,
		content: note.content,
		owner_id: note.ownerId,
		created_at: note.createdAt.toISOString(),
		updated_at: note.updatedAt.toISOString()
	};
}

function assertOwner(note: NoteRow, user: UserRow) {
	if (note.ownerId !== user.id) throw new ApiError(403, 'Not allowed to access this note');
}

async function loadOwned(user: UserRow, noteId: string) {
	const note = await repository.getNoteById(getDb(), noteId);
	if (!note) throw new ApiError(404, 'Note not found');
	assertOwner(note, user);
	return note;
}

export async function listNotes(user: UserRow): Promise<NotePublic[]> {
	const cached = await cacheGet<NotePublic[]>(listKey(user.id));
	if (Array.isArray(cached)) return cached;
	const rows = await repository.listNotesByOwner(getDb(), user.id);
	const out = rows.map(toPublic);
	await cacheSet(listKey(user.id), out, TTL_LIST);
	return out;
}

export async function createNote(user: UserRow, data: NoteCreate): Promise<NotePublic> {
	const title = data.title.trim();
	if (!title) throw new ApiError(422, 'Title cannot be empty');
	const note = await repository.insertNote(getDb(), user.id, { title, content: data.content.trim() });
	const out = toPublic(note);
	await invalidateOwner(user.id);
	await cacheSet(noteKey(user.id, note.id), out, TTL_NOTE);
	return out;
}

export async function getNote(user: UserRow, noteId: string): Promise<NotePublic> {
	const key = noteKey(user.id, noteId);
	const cached = await cacheGet<NotePublic>(key);
	if (cached && typeof cached === 'object') {
		if (cached.owner_id !== user.id) throw new ApiError(403, 'Not allowed to access this note');
		return cached;
	}
	const out = toPublic(await loadOwned(user, noteId));
	await cacheSet(key, out, TTL_NOTE);
	return out;
}

export async function updateNote(user: UserRow, noteId: string, data: NoteUpdate): Promise<NotePublic> {
	const note = await loadOwned(user, noteId);
	if (data.title !== undefined && !data.title.trim()) {
		throw new ApiError(422, 'Title cannot be empty');
	}
	const updated = await repository.updateNoteRow(getDb(), note, {
		title: data.title?.trim(),
		content: data.content?.trim()
	});
	const out = toPublic(updated);
	await invalidateOwner(user.id);
	await cacheSet(noteKey(user.id, noteId), out, TTL_NOTE);
	return out;
}

export async function deleteNote(user: UserRow, noteId: string) {
	await loadOwned(user, noteId);
	await repository.deleteNoteRow(getDb(), noteId);
	await cacheDelete(noteKey(user.id, noteId));
	await invalidateOwner(user.id);
}
