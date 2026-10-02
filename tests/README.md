# Tests

```bat
__ctrl__\hono-svelte-ctrl.bat test all
__ctrl__\hono-svelte-ctrl.bat test backend
__ctrl__\hono-svelte-ctrl.bat test frontend
__ctrl__\hono-svelte-ctrl.bat test contract --base http://localhost:8000
```

`test backend` runs Vitest (`npm run test -w @hono-svelte/backend`) on an in-memory Postgres (PGlite), so it needs no database and no Redis. Specs live in `tests/backend/`. `test frontend` runs the Vitest suite in `tests/frontend` (shared with Fast-Svelte) and `svelte-check`. `test contract` runs `tests/contract/contract_test.py`, the wire-contract test every FoxG kit shares, against a running API. See [docs/testing.md](../docs/testing.md).
