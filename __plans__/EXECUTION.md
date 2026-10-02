# Execution

Hono-Svelte is the TypeScript kit of the FoxG family. It is not a FastAPI rewrite, and it follows [CONTRACT.md](../../../../CONTRACT.md).

## Decisions

- Node.js, not a required Bun runtime
- Hono + `@hono/zod-openapi` for routes, validation, and OpenAPI
- Drizzle for Postgres, SQL files in `backend/drizzle`, written `IF NOT EXISTS` and matching Fast's tables
- Redis for the cache and for the job queue (list `foxg:jobs`, no queue library)
- Zod schemas in `backend/contracts`, used by the backend only
- snake_case JSON, `{"detail": ...}` errors, form login
- The frontend is Fast-Svelte's, with plain `fetch` and no import from the backend
- Full and slim dev profiles
- Backend tests use PGlite so `test backend` does not need Docker

## Stages

| Stage | Acceptance |
|-------|------------|
| Foundation | API, auth, notes, worker, compose, `__ctrl__`, Svelte client |
| Validate stack | `test all` green; `test contract` reports `0 failed` against a running API |
| Hono-Native | Documented client slot. Backend split and native shells are later stages in that kit |

Do not start Hono-Next or Hono-Nuxt from this plan.
