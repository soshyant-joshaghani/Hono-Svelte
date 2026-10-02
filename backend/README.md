# Backend

Hono on Node.js, following the [FoxG wire contract](../../../../CONTRACT.md).

| Path | Role |
|------|------|
| `src/modules/{apps,base,system}` | Route → Service → Repository per module |
| `src/core` | config (`.env` lookup), db, Redis cache, job queue, security, errors |
| `src/db/schema.ts` | Drizzle tables `user` and `note` (Fast's schema) |
| `src/worker` | Redis list worker (`BRPOP foxg:jobs`) |
| `contracts/` | Zod schemas of the wire format, snake_case |
| `drizzle/` | SQL migrations (`IF NOT EXISTS`), applied when the API starts |

Run from the kit root: `npm run dev:api`, `npm run dev:worker`, `npm run test:backend`.
