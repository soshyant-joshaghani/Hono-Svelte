# Runtime profiles

| Profile | Redis | Worker | When |
|---------|-------|--------|------|
| Full | yes | Redis list worker on the host | Default local and every production deploy |
| Slim | omitted | omitted | Local UI work when jobs are not under test |

Slim is explicit: `dev run all --slim`. Cache calls are no-ops and `POST /api/v1/private/jobs/ping` returns `503 Redis unavailable: ...`.

Production `compose.yml` always starts Redis and the worker. Do not ship a slim production stack.
