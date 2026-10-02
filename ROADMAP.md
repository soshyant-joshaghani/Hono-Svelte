# Hono-Svelte roadmap

Hono-Svelte is the TypeScript backend of the FoxG family, starter tier. It implements the [FoxG wire contract](../../../CONTRACT.md), like the other kits, so the Svelte frontend and the database are interchangeable with Fast, Elysia, Rust, Go, and DotNet.

## In this kit

- Hono on Node.js, with routes, services, and repositories
- Zod schemas of the wire format in `backend/contracts` (backend only; the frontend uses plain `fetch`)
- OpenAPI and Scalar at `/docs`, `/sdoc`, and `/api/v1/openapi.json`
- Drizzle schema and SQL migrations that match Fast's tables (`IF NOT EXISTS`)
- JWT login (form), current user, superuser user admin
- Sample notes CRUD with a soft-degrading Redis cache
- Redis list worker (`foxg:jobs`, 3 retries, `ping` task)
- `__ctrl__` for setup, full and slim dev, tests (including `test contract`), and module scaffold
- Docker Compose for dev infrastructure and a production stack behind Traefik

## Next, outside this pass

- Split a standalone backend copy into Hono-Native once the Svelte kit stays green
- WinUI and Compose clients against the same API
- Hono-Next and Hono-Nuxt only after this kit is the stable reference

## Runtime

Node.js 22 is the supported runtime. Hono's Web Standards surface leaves room for another runtime later. Do not make that a requirement for features.
