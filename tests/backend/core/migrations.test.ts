import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import { migrationsFolder } from '../../../backend/src/db/migrate.js';

// The DDL Fast's Alembic revisions 001 and 002 produce (CONTRACT.md, Data).
const FAST_DDL = [
	`CREATE TABLE "user" (email varchar(255) NOT NULL, is_active boolean NOT NULL, is_superuser boolean NOT NULL,
		full_name varchar(255), id uuid NOT NULL, hashed_password varchar NOT NULL, PRIMARY KEY (id))`,
	`CREATE UNIQUE INDEX ix_user_email ON "user" (email)`,
	`CREATE TABLE note (id uuid NOT NULL, title varchar(255) NOT NULL, content varchar(10000) NOT NULL,
		owner_id uuid NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
		PRIMARY KEY (id), FOREIGN KEY (owner_id) REFERENCES "user" (id))`,
	`CREATE INDEX ix_note_owner_id ON note (owner_id)`
];

async function columns(db: PGlite, table: string) {
	const res = await db.query<{ column_name: string; data_type: string; is_nullable: string; len: number | null }>(
		`SELECT column_name, data_type, is_nullable, character_maximum_length AS len
		 FROM information_schema.columns WHERE table_name = $1 ORDER BY column_name`,
		[table]
	);
	return res.rows;
}

describe('SQL migrations', () => {
	it('create the contract tables and indexes', async () => {
		const client = new PGlite();
		await migrate(drizzle(client), { migrationsFolder: migrationsFolder() });

		expect(await columns(client, 'user')).toEqual([
			{ column_name: 'email', data_type: 'character varying', is_nullable: 'NO', len: 255 },
			{ column_name: 'full_name', data_type: 'character varying', is_nullable: 'YES', len: 255 },
			{ column_name: 'hashed_password', data_type: 'character varying', is_nullable: 'NO', len: null },
			{ column_name: 'id', data_type: 'uuid', is_nullable: 'NO', len: null },
			{ column_name: 'is_active', data_type: 'boolean', is_nullable: 'NO', len: null },
			{ column_name: 'is_superuser', data_type: 'boolean', is_nullable: 'NO', len: null }
		]);
		expect(await columns(client, 'note')).toEqual([
			{ column_name: 'content', data_type: 'character varying', is_nullable: 'NO', len: 10000 },
			{ column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'NO', len: null },
			{ column_name: 'id', data_type: 'uuid', is_nullable: 'NO', len: null },
			{ column_name: 'owner_id', data_type: 'uuid', is_nullable: 'NO', len: null },
			{ column_name: 'title', data_type: 'character varying', is_nullable: 'NO', len: 255 },
			{ column_name: 'updated_at', data_type: 'timestamp with time zone', is_nullable: 'NO', len: null }
		]);
		const indexes = await client.query<{ indexname: string }>(
			`SELECT indexname FROM pg_indexes WHERE tablename IN ('user', 'note') ORDER BY indexname`
		);
		expect(indexes.rows.map((r) => r.indexname)).toEqual(
			expect.arrayContaining(['ix_note_owner_id', 'ix_user_email'])
		);
		const unique = await client.query<{ indexdef: string }>(
			`SELECT indexdef FROM pg_indexes WHERE indexname = 'ix_user_email'`
		);
		expect(unique.rows[0]?.indexdef).toMatch(/UNIQUE/);
	});

	it('run against a database Fast already built (IF NOT EXISTS)', async () => {
		const client = new PGlite();
		for (const ddl of FAST_DDL) await client.exec(ddl);
		await client.exec(
			`INSERT INTO "user" (id, email, is_active, is_superuser, hashed_password)
			 VALUES ('11111111-1111-4111-8111-111111111111', 'fast@example.com', true, true, 'x')`
		);
		await migrate(drizzle(client), { migrationsFolder: migrationsFolder() });
		const rows = await client.query(`SELECT email FROM "user"`);
		expect(rows.rows).toEqual([{ email: 'fast@example.com' }]);
	});
});
