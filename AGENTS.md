# AGENTS.md — AI development contract

Read this file before architectural changes in Hono-Svelte.

Hono-Svelte is a product-agnostic foundation: SvelteKit + Hono (Node.js) + Drizzle + PostgreSQL + Redis. Implement features inside this architecture. Do not reshape it as FastAPI, Elysia, or Go.

The HTTP API follows [CONTRACT.md](../../../CONTRACT.md). The frontend is the one Fast-Svelte ships, so the routes, the JSON shapes (snake_case), the errors (`{"detail": ...}`), the PostgreSQL schema, and the Redis keys are the contract, not something this kit may change.

## Start here

| Question | Answer |
|----------|--------|
| What to read first? | This file → [`__plans__/PROGRESS.md`](__plans__/PROGRESS.md) → [docs/architecture.md](docs/architecture.md) → [CONTRACT.md](../../../CONTRACT.md) |
| Where does a feature go? | `backend/src/modules/apps/<name>/` and `frontend/src/lib/modules/apps/<name>/` |
| What is the reference? | `backend/src/modules/apps/sample/` (notes) |
| Where is business logic? | `service.ts` |
| Where is database access? | `repository.ts` |
| Where are the request and response shapes? | `backend/contracts` (Zod, snake_case). They describe the wire format from [CONTRACT.md](../../../CONTRACT.md). Only the backend imports them |
| How does the UI call the API? | `fetch` in the feature `api.ts`, base URL from `$lib/config/backend`. No import from the backend |
| How do migrations work? | SQL in `backend/drizzle/` (`IF NOT EXISTS`), applied when the API starts |
| How are jobs added? | Enqueue from a service after the write succeeds; handle in `backend/src/worker/tasks.ts` |
| How to run it? | `__ctrl__\hono-svelte-ctrl.bat dev run all` |

## Plan loop

1. Take the first eligible `pending` stage, or the stage the user named.
2. Mark it `in_progress` in `__plans__/PROGRESS.md`.
3. Implement it.
4. Run the matching `__ctrl__` test command.
5. Mark `done` only when tests pass.

Do not gitignore `__plans__/`.

## Backend layers

Route → Service → Repository → Drizzle → PostgreSQL

| Layer | Responsibility |
|-------|----------------|
| Route | HTTP only: OpenAPI route with Zod, call a service |
| Service | Rules, authorization, cache, enqueue |
| Repository | Queries and writes only |
| Schema | Drizzle tables in `backend/src/db/schema.ts`, the same tables Fast's Alembic creates |
| Contracts | Zod input and output of the wire format |

Services throw `ApiError` (`backend/src/core/errors.ts`) with a status and a message. The app error handler returns `{"detail": "..."}`. Validation failures are 422 with a string `detail`. Do not invent a second error envelope.

Auth is route middleware (`requireUser`, `requireSuperuser` in `modules/base/auth/deps.ts`), so a missing token is 401 before a bad body is 422.

Mount new routers in `backend/src/app.ts`.

## Frontend

- Svelte 5 runes. Modules only under `base/` and `apps/`.
- Tailwind classes on elements. Tokens only in `frontend/src/app.css`.
- Links and `goto` use `resolve()` from `$app/paths`.
- API access is plain `fetch` in the feature `api.ts`. There is no generated client and no import from `backend/`.
- Do not hard-code the API origin. Use the base URL from `$lib/config/backend`.
- The frontend is shared with Fast-Svelte. Do not fork the wire format for this kit.

## Data

- PostgreSQL is the system of record. The schema is Fast's; new tables go in a new `backend/drizzle/NNNN_name.sql` with `IF NOT EXISTS`, plus its journal entry.
- Redis cache helpers no-op when Redis is down. Do not cache auth.
- Sample notes is the cache example: list and get read through the cache, writes invalidate the owner prefix.
- Jobs use the Redis list protocol in the contract (`LPUSH foxg:jobs`, worker `BRPOP`, 3 retries). Do not add a second queue library.
- Enqueue from services. A missing Redis returns 503.

## What not to do

- Do not port FastAPI, SQLModel, Alembic, ARQ, or Python response shapes into this kit. Follow the contract.
- Do not bring back a typed client shared with the backend (Hono RPC) or camelCase JSON. The frontend must run against any FoxG backend.
- Do not turn the kit into a product (CMS, shop, AI app).
- Do not put business rules in route handlers.
- Do not add a dependency without a reason.

## Definition of done

- Module files in the right places
- Zod contract when the payload is shared
- Migration if tables changed
- Auth on anything that is not public
- Tests for the behavior that can fail
- `test contract` passes against a running API when routes or shapes changed
- `__plans__/PROGRESS.md` updated when a stage was in progress
