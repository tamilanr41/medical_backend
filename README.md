# Zhanx HMS — Home Dashboard & Module Launcher

A production-ready Hospital Management System home dashboard: a modern
reimplementation of the legacy Zhanx HMS home page as a Next.js
application. It preserves the legacy module catalogue (reference IDs
101–124, 127), the ID → route mapping, role-based module permissions and
the click-to-open module workflow, while adding search, favourites,
recently-used tracking and a fully responsive shell.

## Features

- **Module launcher** — all 24 legacy modules rendered as cards, grouped
  by clinical/administrative category, with per-category counts and
  quick search (`"phar"`, `"lab"`, `"dial"`, reference IDs, …).
- **Permission model** — every module is annotated server-side with an
  `allowed` flag derived from the signed-in role. Restricted cards stay
  visible in a locked state (configurable to `hidden` in
  `config/permissions.js`) and module routes enforce access again on
  the server.
- **Command palette** — `Ctrl/⌘ + K` opens a permission-aware module
  search with full keyboard navigation (↑↓ ↵ esc), backed by
  `/api/modules`.
- **Favourites & recents** — star modules into “Frequently Used”; the
  launcher records the last opened modules. Stored in `localStorage`
  and kept reactive across components via `useSyncExternalStore`.
- **Session auth** — HMAC-signed, expiring, `HttpOnly` cookies
  (`hms_session`), proxy-level redirect gate, login/logout/change
  password endpoints. Demo users ship in `lib/demo-users.js`.
- **Settings** — navigation to all 18 legacy settings workspaces with
  role-gated (admin-only) categories.
- **A11y & polish** — skip link, focus-visible outlines, ARIA live
  regions, `prefers-reduced-motion` support, skeleton loading states.

## Tech stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · lucide-react ·
Plain JavaScript (no TypeScript)

## Getting started

```bash
npm install
npm run dev        # development server on http://localhost:3000
npm run lint       # eslint
npm run build      # production build
npm run start      # serve the production build
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### Demo accounts

All passwords are `demo@123`:

| Username     | Role                    |
| ------------ | ----------------------- |
| `admin`      | Super Administrator     |
| `doctor`     | Doctor                  |
| `nurse`      | Nursing Staff           |
| `reception`  | Receptionist            |
| `labtech`    | Laboratory Technician   |
| `pharmacist` | Pharmacist              |
| `billing`    | Billing Executive       |
| `insurance`  | Insurance Officer       |
| `hr`         | HR Executive            |
| `purchase`   | Procurement Officer     |
| `mrd`        | MRD Officer             |

Sign in as `labtech` to see locked modules (e.g. Pharmacy) and the
server-enforced permission panel on module routes.

### Session secret

In production set a strong secret:

```bash
SESSION_SECRET="your-secret" npm run start
```

## Project structure

```
app/
  login/                     sign-in screen
  api/auth/{login,logout,change-password}/
  api/modules/               permission-aware launcher payload
  (app)/                     authenticated shell (layout enforces session)
    home/                    dashboard / module launcher
    [module]/                module workspace (permission + placeholder)
    settings/[category]/     settings workspaces
    profile/                 profile, change password, preferences
components/
  layout/                    AppShell, Header, Sidebar, Drawer nav
  modules/                   ModuleLauncher, ModuleCard, ModuleSearch, …
  ui/                        Button, Dialog, Drawer, StatePanel, Skeleton
config/
  modules.js                 module catalogue, categories, ID → route map
  permissions.js             roles, ROLE_PERMISSIONS, visibility mode
  settings.js                settings navigation (18 workspaces)
lib/
  auth.js                    signed session cookies
  demo-users.js              seeded demo identities
  storage.js                 favourites / recents / preferences store
  module-utils.js            filtering, grouping, slug lookup
proxy.js                     optimistic auth redirect gate
```

## Notes

- Module screens are deliberate placeholders — the launcher validates
  *enabled* → *permission* → *records recent* → *navigates*, mirroring
  the legacy `changeQuickMenu()` workflow.
- Permissions live in `config/permissions.js` and are the single
  integration point for a future backend.
- `npm run build` and `npm run lint` both pass clean.
