# Progress

| Stage | Status | Note |
|-------|--------|------|
| Foundation | done | Hono, Drizzle, Zod, Docker, Traefik, `__ctrl__`, sample notes, SvelteKit shell |
| Wire contract | done | Follows CONTRACT.md: Fast routes, snake_case, `detail` errors, form login, Fast's tables. `test contract` reports 51 passed, 0 failed |
| Shared frontend | done | Fast-Svelte's UI with plain `fetch`; no import from the backend (Hono RPC removed) |
| Redis cache and jobs | done | Soft-degrading cache, Redis list worker (`foxg:jobs`, 3 retries, `ping`); BullMQ removed |
| Validate stack | done | Backend Vitest 54 tests (PGlite), frontend Vitest and `svelte-check`, backend and frontend Docker images build |
| Live Docker walkthrough | pending | The API and worker ran in containers against Postgres 18 and Redis 8 and passed the contract test. `dev run all` with Traefik and a browser sign-in is not run yet |
| Hono-Native shells | pending | Web slot and docs exist. WinUI and Compose apps are not built |

Last update: 2026-10-01
