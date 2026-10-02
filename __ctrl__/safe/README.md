# safe/ — keys, addresses, prod env (local only)

| Pattern | Purpose |
|---------|---------|
| `*-privatekey.pem` | SSH private key |
| `*-address.txt` | VM IP / hostname (first line) |
| `*-env.env` | Production secrets → uploaded as `~/projects/hono-svelte/.env` |

| Files | Server id |
|-------|-----------|
| `ar-hono-svelte-bamdad-*` | `hono-svelte` |

Copy the `*.example` stubs, drop the `.example` suffix, and fill real values.

`*.pem`, `*.env`, `*-address.txt` are gitignored.

Upload env to VM:

```bat
hono-svelte-ctrl.bat env
```

That copies `safe/ar-hono-svelte-bamdad-env.env` → `~/projects/hono-svelte/.env`.
