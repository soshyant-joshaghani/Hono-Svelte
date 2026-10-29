# Testing

```bat
__ctrl__\hono-svelte-ctrl.bat test all
__ctrl__\hono-svelte-ctrl.bat test backend
__ctrl__\hono-svelte-ctrl.bat test frontend
__ctrl__\hono-svelte-ctrl.bat test contract --base http://localhost:8000
```

| Target | Runner | Location |
|--------|--------|----------|
| Backend | Vitest | `tests/backend/` mirroring `apps/`, `base/`, `system/`, `core/`, `worker/` |
| Frontend | Vitest, then `svelte-check` | `tests/frontend/`, `frontend/` |
| Contract | `contract_test.py` | `tests/contract/` (copy of `contract/contract_test.py`) |

Backend tests run against PGlite (in-memory Postgres) built from the real SQL migrations, so they need neither Docker Postgres nor Redis. `backend/vitest.config.ts` sets the test environment (cheap bcrypt, Redis off). A separate test replaces `core/redis.ts` with an in-memory map to check the cache keys and TTLs. `pretest` builds `backend/contracts` first. They cover the contract's status codes and error strings, auth and owner rules, trimming, the `IF NOT EXISTS` migration against a Fast-shaped database, config and `.env` lookup, the job queue, and the worker's retry handling.

Add a case next to the module you changed. Sample notes live in `tests/backend/apps/sample/`. Login lives in `tests/backend/base/auth/login.test.ts`.

`test contract` needs a running API with `ENVIRONMENT=local` and Redis (it enqueues a ping job). It is the acceptance test every FoxG kit shares and is not part of `test all`.
