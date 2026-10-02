import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../../core/db.js';
import { notes, type NoteRow } from '../../../db/schema.js';

export async function listNotesByOwner(db: AppDatabase, ownerId: string) {
	return db.select().from(notes).where(eq(notes.ownerId, ownerId)).orderBy(desc(notes.updatedAt));
}

export async function getNoteById(db: AppDatabase, noteId: string) {
	const rows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1);
	return rows[0] ?? null;
}

export async function insertNote(
	db: AppDatabase,
	ownerId: string,
	data: { title: string; content: string }
) {
	const now = new Date();
	const rows = await db
		.insert(notes)
		.values({ title: data.title, content: data.content, ownerId, createdAt: now, updatedAt: now })
		.returning();
	const created = rows[0];
	if (!created) throw new Error('Could not create note');
	return created;
}

/** Writes only the fields present in `data`; with none, the note is returned untouched. */
export async function updateNoteRow(
	db: AppDatabase,
	note: NoteRow,
	data: { title?: string; content?: string }
) {
	const changes: { title?: string; content?: string } = {};
	if (data.title !== undefined) changes.title = data.title;
	if (data.content !== undefined) changes.content = data.content;
	if (Object.keys(changes).length === 0) return note;
	const rows = await db
		.update(notes)
		.set({ ...changes, updatedAt: new Date() })
		.where(eq(notes.id, note.id))
		.returning();
	return rows[0] ?? note;
}

export async function deleteNoteRow(db: AppDatabase, noteId: string) {
	await db.delete(notes).where(eq(notes.id, noteId));
}

export async function deleteNotesByOwner(db: AppDatabase, ownerId: string) {
	await db.delete(notes).where(eq(notes.ownerId, ownerId));
}
