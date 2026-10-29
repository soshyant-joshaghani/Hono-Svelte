# Architecture

```text
HTTP
  → Hono route (Zod OpenAPI, auth middleware)
  → service
  → repository
  → Drizzle
  → PostgreSQL
```

Jobs leave the service through `jobQueue().enqueue()`, land in the Redis list `foxg:jobs`, and run in the worker process (`backend/src/worker`).

The API follows [CONTRACT.md](../../../../CONTRACT.md): Fast's routes, snake_case JSON, `{"detail": ...}` errors, Fast's PostgreSQL tables, Fast's Redis keys. The Svelte frontend is the one Fast-Svelte ships. It calls the API with `fetch` and imports nothing from `backend/`, so any FoxG backend can sit under it.

## Layout

```text
hono-svelte/
├── backend/contracts/      Zod schemas of the wire format (backend only)
├── backend/drizzle/        SQL migrations (IF NOT EXISTS) and Drizzle journal
├── backend/src/
│   ├── app.ts              Hono app, CORS, errors, /docs, /sdoc, openapi.json
│   ├── core/               config, db, redis cache, job queue, security, errors
│   ├── db/schema.ts        the contract's "user" and note tables
│   ├── modules/
│   │   ├── system/         /utils health-check, local-only /private routes
│   │   ├── base/auth/      login, me, bearer middleware
│   │   ├── base/users/     superuser user admin
│   │   └── apps/sample/    canonical notes
│   └── worker/             BRPOP loop, handler (retries), tasks (ping)
├── frontend/src/lib/modules/
│   ├── base/
│   └── apps/
├── tests/                  backend/ frontend/ contract/
├── __ctrl__/
└── compose*.yml
```

## Auth

`POST /api/v1/base/login/access-token` takes a urlencoded form (`username`, `password`) and returns `{"access_token", "token_type": "bearer"}`. Wrong credentials are 400 `Incorrect email or password`; an inactive user is 400 `Inactive user`.

`GET /api/v1/base/login/me` requires `Authorization: Bearer <jwt>`. No header is 401 `Not authenticated`; a bad or expired token, or an unknown user, is 401 `Could not validate credentials`. Both send `WWW-Authenticate: Bearer`.

The JWT is HS256 with `sub` (user uuid) and `exp` (`ACCESS_TOKEN_EXPIRE_MINUTES`, default 11520). Passwords are bcrypt `$2b$` hashes, so a hash written by any FoxG backend verifies here.

Notes are visible only to their owner (403 `Not allowed to access this note` otherwise). The user list and user writes are superuser-only (403 `The user doesn't have enough privileges`).

## Private routes

`/api/v1/private/ping`, `/private/users`, and `/private/jobs/ping` are mounted only when `ENVIRONMENT=local`.

## Errors

`ApiError` becomes `{"detail": "..."}` with the status set on the error. Zod validation failures, unparsable bodies, and malformed ids are 422 with a string `detail`.

## Docs

`/docs` is Swagger UI, `/sdoc` is Scalar (theme `elysiajs`, security scheme `OAuth2PasswordBearer`), and the spec is `/api/v1/openapi.json`.
