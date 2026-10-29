import { randomUUID } from 'node:crypto';
import { boolean, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

// Same tables Fast's Alembic creates (CONTRACT.md, Data). The API supplies ids and
// timestamps, so the columns carry no database defaults.

export const users = pgTable(
	'user',
	{
		id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
		email: varchar('email', { length: 255 }).notNull(),
		isActive: boolean('is_active').notNull(),
		isSuperuser: boolean('is_superuser').notNull(),
		fullName: varchar('full_name', { length: 255 }),
		hashedPassword: varchar('hashed_password').notNull()
	},
	(table) => [uniqueIndex('ix_user_email').on(table.email)]
);

export const notes = pgTable(
	'note',
	{
		id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
		title: varchar('title', { length: 255 }).notNull(),
		content: varchar('content', { length: 10000 }).notNull(),
		ownerId: uuid('owner_id')
			.notNull()
			.references(() => users.id),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
	},
	(table) => [index('ix_note_owner_id').on(table.ownerId)]
);

export type UserRow = typeof users.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
