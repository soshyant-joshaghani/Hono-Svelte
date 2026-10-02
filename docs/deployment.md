# Deployment

Production is Docker Compose from `compose.yml`, started on a VM through `__ctrl__` or locally for a smoke test.

```bat
__ctrl__\hono-svelte-ctrl.bat prod start
__ctrl__\hono-svelte-ctrl.bat prod stop
```

`prod start` runs `docker compose -f compose.yml up -d --build`. The backend image builds `backend/contracts` and the Hono app; the worker runs the same image with `node backend/dist/worker/worker.js`. The frontend image builds the SvelteKit site. Traefik lives in `compose.traefik.yml`, which `compose.yml` includes.

Before a shared or public deploy:

- Replace `SECRET_KEY`, `FIRST_SUPERUSER_PASSWORD`, and the Postgres password. `ENVIRONMENT=production` refuses to start when the first two are `changethis`.
- Set `DOMAIN` and the URLs in `compose.yml` (`x-prod-app-config`). Dev uses `api.localhost` and `dashboard.localhost`.
- Keep Redis and the worker. Jobs are part of the full stack.

Remote operations (`ping`, `setup`, `clone`, `env`, `start`, `stop`, `status`, `update`, `flatten`, `restore-flat`) use `__ctrl__/servers.json` and key material under `__ctrl__/safe/`. The example address and env files are committed. Real keys stay gitignored. See `__ctrl__/README.md`.
