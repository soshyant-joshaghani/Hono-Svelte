# Dashboard UI

The Svelte dashboard is Tailwind and shadcn-svelte. The canonical page is sample notes at http://dashboard.localhost/sample/notes.

| Piece | Path |
|-------|------|
| Shell | `frontend/src/lib/modules/base/` |
| Primitives | `frontend/src/lib/modules/base/ui/` |
| Sample client | `frontend/src/lib/modules/apps/sample/` |
| Notes page | `frontend/src/routes/(dashboard)/sample/notes/+page.svelte` |
| Theme | `frontend/src/app.css` |

The frontend is a copy of the one Fast-Svelte ships. It calls the API with plain `fetch` (`$lib/config/backend` holds the base URL) and imports nothing from `backend/`, so the same UI runs against any FoxG backend. Keep the route and the module name when a product moves between families.
