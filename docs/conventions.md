# Conventions

Naming and layer rules for Hono-Svelte. Platform code in `base/` and `system/` is the baseline. Product code goes in `apps/<name>/`.

## Naming

| Element | Style | Example |
|---------|-------|---------|
| Folders and TS modules | `kebab-case` or a single domain word | `sample/`, `router.ts` |
| Types and Zod schemas | `PascalCase` with a suffix | `NoteCreateSchema`, `NotePublic` |
| Functions and variables | `camelCase` | `listNotes` |
| Booleans | `is` or `has` prefix | `isActive` |
| JSON fields | `snake_case` (the wire contract) | `owner_id`, `access_token` |
| DB columns | `snake_case` | `owner_id`, `hashed_password` |
| HTTP paths | plural, under `/api/v1` | `GET /api/v1/sample/notes` |
| Svelte routes | folder paths | `routes/(dashboard)/sample/notes/+page.svelte` |

Schema suffixes live in `backend/contracts`: `Create`, `Update`, `Public`. Avoid names like `data`, `info`, or `temp`.

## Backend layers

```text
Router → Service → Repository → Drizzle
```

| Layer | Does | Does not |
|-------|------|----------|
| Router | OpenAPI, Zod, call the service | Business rules, SQL |
| Service | Rules, cache invalidation, `enqueue()` | SQL, HTTP response formatting |
| Repository | Drizzle queries | HTTP, job enqueue |
| Contracts | Zod shapes of the wire format | Database access |

Register an app router in `backend/src/app.ts`. Login stays in `backend/src/modules/base/auth/`. Health stays in `backend/src/modules/system/`.

## Frontend

Only `frontend/src/lib/modules/base/` and `frontend/src/lib/modules/apps/<name>/`. Primitives live in `base/ui/`. Style with Tailwind utilities. Tokens live in `frontend/src/app.css`. Do not add a top-level `components/` folder.

## Across families

Module folder names match Fast-Svelte (`apps/sample`, `base`, `system`) and the wire format is [CONTRACT.md](../../../../CONTRACT.md). The implementation is Hono, Drizzle, and a Redis list worker. Do not copy FastAPI routers, Alembic revisions, or ARQ workers into this tree.
