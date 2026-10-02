# CLI

```bat
__ctrl__\hono-svelte-ctrl.bat <command>
```

```bash
__ctrl__/hono-svelte-ctrl.sh <command>
```

| Command | Effect |
|---------|--------|
| `setup-local` | Require Node 22, copy `.env` if missing, `npm install` (workspace), build `backend/contracts` |
| `dev run all` | Postgres, Redis, Traefik, Adminer, API (applies the SQL migrations), worker, Vite |
| `dev run all --slim` | Same without Redis and the worker |
| `dev run infra` | Containers only |
| `dev run apps` | API, worker, Vite. Pair with infra already running |
| `dev stop all` | Stop host processes, then `docker compose stop` |
| `test all` | Backend Vitest, then frontend Vitest and `svelte-check` |
| `test backend` | API tests on PGlite (in-memory Postgres) |
| `test frontend` | Frontend Vitest and `svelte-check` |
| `test contract [--base URL]` | `tests/contract/contract_test.py` against a running API (default `http://localhost:8000`, `--local --jobs`). Not part of `test all` |
| `app create <name>` | Module stub. Mount the router in `backend/src/app.ts` yourself |
| `prod start` | `docker compose -f compose.yml up -d --build` |
| `prod stop` | Stop the production compose project |
| `logs` | Host process logs and production logs |
| `flatten` / `restore-flat` | Single-root git history |
| `ping`, `clone`, `env`, `start`, `stop`, `status`, `update` | SSH operations from `servers.json` |

Logs for host processes: `__ctrl__/.run/*.log` (gitignored).

Set a real `SECRET_KEY` and database password before `prod start`. `ENVIRONMENT=production` rejects `SECRET_KEY` and `FIRST_SUPERUSER_PASSWORD` set to `changethis`.
