# Modules

App features live in `backend/src/modules/apps/<name>/` with a client in `frontend/src/lib/modules/apps/<name>/`.

| File | Role |
|------|------|
| `router.ts` | OpenAPI routes, Zod, auth middleware, call the service |
| `service.ts` | Rules, authorization, cache, enqueue |
| `repository.ts` | Drizzle |
| `backend/contracts` | Zod shapes of the wire format (snake_case) |

Register the router on the API in `backend/src/app.ts`.

Scaffold:

```bat
__ctrl__\hono-svelte-ctrl.bat app create myfeature
```

Then mount `myfeatureRoutes` on the `api` router in `backend/src/app.ts`. Keep the wire format from [CONTRACT.md](../../../../CONTRACT.md) (snake_case JSON, `{"detail": ...}` errors). The sample notes module is the depth to copy for CRUD, including cache invalidation.

Platform modules (`base`, `system`) ship with the kit. Product behavior does not go there.
