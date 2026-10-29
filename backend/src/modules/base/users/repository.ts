import { asc, count, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../../core/db.js';
import { users, type UserRow } from '../../../db/schema.js';

export async function findUserByEmail(db: AppDatabase, email: string) {
	const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
	return rows[0] ?? null;
}

export async function findUserById(db: AppDatabase, id: string) {
	const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listUsers(db: AppDatabase, skip: number, limit: number) {
	return db.select().from(users).orderBy(asc(users.email)).offset(skip).limit(limit);
}

export async function countUsers(db: AppDatabase) {
	const rows = await db.select({ value: count() }).from(users);
	return rows[0]?.value ?? 0;
}

export type NewUser = {
	email: string;
	hashedPassword: string;
	isActive: boolean;
	isSuperuser: boolean;
	fullName: string | null;
};

export async function insertUser(db: AppDatabase, input: NewUser) {
	const rows = await db.insert(users).values(input).returning();
	const created = rows[0];
	if (!created) throw new Error('Could not create user');
	return created;
}

/** Only the keys present in `changes` are written. */
export async function updateUserRow(
	db: AppDatabase,
	user: UserRow,
	changes: Partial<NewUser>
) {
	const defined = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
	if (Object.keys(defined).length === 0) return user;
	const rows = await db.update(users).set(defined).where(eq(users.id, user.id)).returning();
	return rows[0] ?? user;
}

export async function deleteUserRow(db: AppDatabase, id: string) {
	await db.delete(users).where(eq(users.id, id));
}
