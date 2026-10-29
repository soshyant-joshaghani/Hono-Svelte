[![](./FoxG-Kit.png)](./FoxG-Kit.png)

# Hono-Svelte

GitHub: [Hono-Svelte](https://github.com/soshyant-joshaghani/Hono-Svelte)

**Hono + Node.js + Drizzle + Zod + SvelteKit + PostgreSQL + Redis.**

The starter-tier Hono kit of the FoxG family. It speaks the [FoxG wire contract](../../../CONTRACT.md), so the SvelteKit `frontend/` is the same one Fast-Svelte ships and a project can change backend without touching the UI, the database, or the Redis keys.

Hono-Svelte is a product-agnostic launchpad. Dashboards, CRUD, SaaS, and consumer apps add modules. They do not grow a new architecture.

**Docs:** [AGENTS.md](AGENTS.md) · [ROADMAP.md](ROADMAP.md) · [docs/](docs/) · [plans](__plans__/PROGRESS.md) · [`__ctrl__`](__ctrl__/README.md)

```bat
__ctrl__\hono-svelte-ctrl.bat setup-local
__ctrl__\hono-svelte-ctrl.bat dev run all
```

Linux and macOS use `__ctrl__/hono-svelte-ctrl.sh`. `setup-local` copies `.env.example` to `.env` when needed, runs `npm install` for the workspace (`backend`, `backend/contracts`, `frontend`) and builds `backend/contracts`. Prerequisites: Node.js 22, Python 3.12+ for `__ctrl__`, Docker.

| Service | URL |
|---------|-----|
| Dashboard | http://dashboard.localhost |
| Sample notes | http://dashboard.localhost/sample/notes |
| API (Swagger) | http://api.localhost/docs |
| API (Scalar) | http://api.localhost/sdoc |
| OpenAPI | http://api.localhost/api/v1/openapi.json |
| Adminer | http://adminer.localhost |
| Traefik | http://localhost:8080 |
| Direct Vite | http://localhost:5000 |
| Direct API | http://localhost:8000/docs |
| Superuser | `admin@example.com` / `Admin@1234` |

Change the superuser and `SECRET_KEY` before any shared or production deploy.

## Layout

```text
backend/                    Hono API and worker (Node.js)
  contracts/                Zod schemas (snake_case wire shapes), used by the backend only
  drizzle/                  SQL migrations, IF NOT EXISTS, applied when the API starts
  src/modules/apps/sample   notes, the canonical example
  src/modules/base/         auth and users
  src/modules/system/       health and private dev routes
  src/core/                 config, db, cache, jobs, security, errors
  src/worker/               Redis list worker
frontend/                   SvelteKit (copy of Fast-Svelte's UI, plain fetch)
tests/                      backend/, frontend/, contract/
traefik/ docs/ __plans__/
__ctrl__/                   Python CLI: dev, test, app, prod, remote
compose.yml compose.dev.yml compose.traefik.yml
```

Layers: Route (Hono + Zod OpenAPI) → Service → Repository (Drizzle) → PostgreSQL. See [docs/architecture.md](docs/architecture.md).

The frontend does not import anything from the backend. It calls the HTTP API, so the backend can be swapped.

## Runtime profiles

| Profile | Command | Includes |
|---------|---------|----------|
| Full | `dev run all` | Postgres, Redis, worker, Traefik, Adminer, API, Vite |
| Slim | `dev run all --slim` | Postgres, Traefik, Adminer, API, Vite |

Production always runs the full stack. See [docs/runtime-profiles.md](docs/runtime-profiles.md).

## Adding a feature

1. Copy `backend/src/modules/apps/sample/` to `backend/src/modules/apps/<name>/` (router, service, repository).
2. Put the Zod shapes in `backend/contracts/src/` and mount the router in `backend/src/app.ts`.
3. Add `backend/drizzle/NNNN_<name>.sql` (write it `IF NOT EXISTS`) and its entry in `backend/drizzle/meta/_journal.json` when tables change.
4. Add `frontend/src/lib/modules/apps/<name>/api.ts` and a route under `frontend/src/routes/(dashboard)/`.
5. Add tests in `tests/backend/`.

`__ctrl__\hono-svelte-ctrl.bat app create <name>` writes the stubs. Copy the depth of `sample` before adding rules.

## Changing backend

The Svelte `frontend/`, `traefik/`, `tests/frontend`, the module names, the wire contract, and the PostgreSQL schema are shared with [Fast-Svelte](../../../fast-kit/fast-template/fast-svelte/README.md). To move a project from another family:

1. Take the target template (`fast-svelte`, `rust-svelte`, `dotnet-svelte`, and so on).
2. Copy the product's `frontend/src/lib/modules/apps/<name>/` and its routes into it.
3. Rebuild `<name>` under the target's backend path. Keep the routes and JSON from [CONTRACT.md](../../../CONTRACT.md).
4. Point it at the same database. Fast's Alembic tables and this kit's `backend/drizzle` are the same schema.

Index: [foxg-kit](../../../README.md).

## Tests

```bat
__ctrl__\hono-svelte-ctrl.bat test all
__ctrl__\hono-svelte-ctrl.bat test contract --base http://localhost:8000
```

Backend Vitest runs on an in-memory Postgres (PGlite), so it needs no database. `test frontend` runs Vitest and `svelte-check`. `test contract` runs the shared `contract_test.py` against a running API and is not part of `test all`. See [docs/testing.md](docs/testing.md).

## Production

```bat
__ctrl__\hono-svelte-ctrl.bat setup
__ctrl__\hono-svelte-ctrl.bat clone
__ctrl__\hono-svelte-ctrl.bat env
__ctrl__\hono-svelte-ctrl.bat start
```

See [docs/deployment.md](docs/deployment.md).

## Environment

Copy `.env.example` to `.env`. Variable names match Fast (`SECRET_KEY`, `POSTGRES_*`, `REDIS_*`, `FIRST_SUPERUSER*`, `APP_PORT`). The API and the worker read the process environment first, then `.env` (looked up in `.`, `..`, `../..`). `PUBLIC_API_BASE_URL` is where the frontend calls the API (`/api/v1` through the Vite proxy in dev).

Other families: [Fast-Svelte](../../../fast-kit/fast-template/fast-svelte/README.md), [Elysia-Svelte](../../../elysia-kit/elysia-template/elysia-svelte/README.md), [Rust-Svelte](../../../rust-kit/rust-template/rust-svelte/README.md), [Go-Svelte](../../../go-kit/go-template/go-svelte/README.md), [DotNet-Svelte](../../../dotnet-kit/dotnet-template/dotnet-svelte/README.md).
