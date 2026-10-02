-- Same shape as Fast's Alembic revisions 001 and 002, written IF NOT EXISTS so the API
-- can start against a database that Fast (or Rust / .NET) already built.
CREATE TABLE IF NOT EXISTS "user" (
  "id" uuid PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "is_active" boolean NOT NULL,
  "is_superuser" boolean NOT NULL,
  "full_name" varchar(255),
  "hashed_password" varchar NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ix_user_email" ON "user" ("email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "note" (
  "id" uuid PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" varchar(10000) NOT NULL,
  "owner_id" uuid NOT NULL REFERENCES "user" ("id"),
  "created_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ix_note_owner_id" ON "note" ("owner_id");
