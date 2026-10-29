# Background jobs

```text
service enqueue()
    → LPUSH foxg:jobs  {"id","task","args","enqueued_at"}
    → worker BRPOP foxg:jobs 5   (backend/src/worker)
```

This is the contract's Redis list protocol. There is no queue library, so a queued job is readable by every FoxG kit except Fast (Fast keeps ARQ).

| Piece | Where |
|-------|-------|
| Enqueue | `backend/src/core/queue.ts` (`jobQueue().enqueue(task, args)`) |
| Worker loop | `backend/src/worker/worker.ts` (own Redis connection, reconnects while Redis is down) |
| Retries | `backend/src/worker/handler.ts`: a failed task is re-pushed with `attempt` n, up to 3 times |
| Tasks | `backend/src/worker/tasks.ts` (`ping` logs `ping job received: <message>`) |

An unknown task is logged and dropped. A malformed payload is logged and dropped.

Local-only route: `POST /api/v1/private/jobs/ping?message=ping` returns `{"job_id", "message"}`. When Redis is down it returns `503 {"detail": "Redis unavailable: ..."}`, which is also what the slim profile gives.

To add a task: register it in `tasks.ts`, and enqueue it from a service after the database write succeeds. Do not add a second queue library. Do not enqueue from a route handler.

Start the worker with `npm run worker -w @hono-svelte/backend` (dev) or `node backend/dist/worker/worker.js` (built image).
