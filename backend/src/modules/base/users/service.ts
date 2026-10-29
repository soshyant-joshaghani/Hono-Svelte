import type {
	PrivateUserCreate,
	UserCreate,
	UserPublic,
	UsersPublic,
	UserUpdate
} from '@hono-svelte/contracts';
import { getDb } from '../../../core/db.js';
import { ApiError } from '../../../core/errors.js';
import { hashPassword } from '../../../core/security.js';
import type { UserRow } from '../../../db/schema.js';
import { deleteNotesByOwner } from '../../apps/sample/repository.js';
import * as repository from './repository.js';

const NOT_ENOUGH_PRIVILEGES = "The user doesn't have enough privileges";

export function toPublicUser(user: UserRow): UserPublic {
	return {
		id: user.id,
		email: user.email,
		is_active: user.isActive,
		is_superuser: user.isSuperuser,
		full_name: user.fullName
	};
}

export function assertSuperuser(user: UserRow) {
	if (!user.isSuperuser) throw new ApiError(403, NOT_ENOUGH_PRIVILEGES);
}

export async function listUsers(skip: number, limit: number): Promise<UsersPublic> {
	const db = getDb();
	const [rows, total] = await Promise.all([
		repository.listUsers(db, skip, limit),
		repository.countUsers(db)
	]);
	return { data: rows.map(toPublicUser), count: total };
}

export async function createUser(input: UserCreate): Promise<UserPublic> {
	const db = getDb();
	if (await repository.findUserByEmail(db, input.email)) {
		throw new ApiError(400, 'The user with this email already exists in the system.');
	}
	const created = await repository.insertUser(db, {
		email: input.email,
		hashedPassword: await hashPassword(input.password),
		isActive: input.is_active,
		isSuperuser: input.is_superuser,
		fullName: input.full_name ?? null
	});
	return toPublicUser(created);
}

/** `/private/users`: local-only helper, always a regular active user. */
export async function createPrivateUser(input: PrivateUserCreate): Promise<UserPublic> {
	return createUser({
		email: input.email,
		password: input.password,
		is_active: true,
		is_superuser: false,
		full_name: input.full_name
	});
}

/** Self returns the user; anyone else needs a superuser. */
export async function readUser(actor: UserRow, id: string): Promise<UserPublic> {
	if (actor.id === id) return toPublicUser(actor);
	assertSuperuser(actor);
	const user = await repository.findUserById(getDb(), id);
	if (!user) throw new ApiError(404, 'User not found');
	return toPublicUser(user);
}

export async function updateUser(id: string, input: UserUpdate): Promise<UserPublic> {
	const db = getDb();
	const user = await repository.findUserById(db, id);
	if (!user) throw new ApiError(404, 'The user with this id does not exist in the system');
	if (input.email) {
		const existing = await repository.findUserByEmail(db, input.email);
		if (existing && existing.id !== id) {
			throw new ApiError(409, 'User with this email already exists');
		}
	}
	const updated = await repository.updateUserRow(db, user, {
		email: input.email,
		hashedPassword: input.password === undefined ? undefined : await hashPassword(input.password),
		isActive: input.is_active,
		isSuperuser: input.is_superuser,
		fullName: input.full_name
	});
	return toPublicUser(updated);
}

export async function deleteUser(actor: UserRow, id: string) {
	const db = getDb();
	const user = await repository.findUserById(db, id);
	if (!user) throw new ApiError(404, 'User not found');
	if (user.id === actor.id) {
		throw new ApiError(403, 'Super users are not allowed to delete themselves');
	}
	await db.transaction(async (tx) => {
		await deleteNotesByOwner(tx as unknown as typeof db, id);
		await repository.deleteUserRow(tx as unknown as typeof db, id);
	});
	return { message: 'User deleted successfully' };
}
