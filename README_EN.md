# policy-insight-hub

[![Version](https://img.shields.io/badge/version-v1.1.1-blue.svg)](https://github.com/watanabe3tipapa/policy-insight-hub)
[![Issues](https://img.shields.io/github/issues/watanabe3tipapa/policy-insight-hub.svg)](https://github.com/watanabe3tipapa/policy-insight-hub/issues)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**EBPM. Collect policy data relentlessly, structure it, make it shareable.**

policy-insight-hub is a **policy data hub** for Evidence-Based Policy Making (EBPM).
It manages the data registry, indicator dictionary, time-series observations, review logs,
and international policy essences in one structure, and keeps the evidence up to date
through external Kitesurf Worker collection and startup stale detection. Data can be
carried out to analysis tools as a standard SQLite .db file.

[日本語](README.md) | [English](README_EN.md)

## Concept

### Why a "shareable policy data hub"

EBPM means designing and validating policy with evidence. But if the data, definitions,
and decision history stay scattered, evidence never spreads into practice. This tool
binds them into one structure — "registry → dictionary → observation → record → evaluation" —
so that anyone can reproduce and share the evidence.

| Practice | policy-insight-hub's counterpart |
|---|---|
| Make clear where the evidence lives | Data registry (source, owner, updated at) |
| Share the meaning and history of KPIs | Indicator dictionary (definition, formula, target, source linkage) |
| Track measured values continuously | Time-series dashboard (Recharts charts) |
| Keep the decision history for later learning | Review logs (agenda, findings, action tracking) |
| Keep external information up to date | Kitesurf Worker collection + startup stale detection |
| Compare international evidence by criteria | Policy essences (5 evaluation axes) |
| Carry evidence to analysis tools | SQLite .db data exchange |

### Consideration: what EBPM tools must assume

1. **Make the evidence trail explicit** — sources, provenance, and timestamps must be traceable in code and data
2. **Share the definitions** — the same name with different definitions cannot be compared; align assumptions in the dictionary
3. **Keep the decision history** — the learning of policy improvement survives staff changes
4. **Stay fresh** — data sources quietly break; startup stale detection and refresh keep everything current
5. **Never stop on failure** — DB-unavailable or fetch failures are absorbed as explicit skips and never block server startup
6. **Guard the roles** — administrator password login + admin role access control for writes

## Features

- **Policy dashboard**: visualizes registered time-series with Recharts line/bar charts
- **Data registry**: register, list, search, edit, last-updated display, CSV/JSON export
- **Indicator dictionary**: definition, formula, target, data-source linkage, freshness badges, CSV/JSON export
- **Review logs**: track agenda, findings, action items, assignees, and status
- **Info collection (Kitesurf)**: Worker URL configuration, collection logs, and source-candidate review
- **Startup stale refresh**: stale detection → 15-minute lease against duplicate runs → audit state saved to the dashboard
- **International EBPM policy essences**: compare across 5 axes — evidence transparency, design credibility, context fit, equity impact, transferability
- **Data exchange (SQLite .db)**: exports a normalized standard format and verifies format/counts in the browser (no server upload)
- **Authentication & role control**: administrator password login + procedure-level admin access control on tRPC
- **Modern SPA**: Vite + React 19 + TypeScript + tRPC v11 + drizzle-orm (Cloudflare D1)

## Quick Start

### Prerequisites

| Tool | Required version | Check command |
|---|---|---|
| Node.js | >= 20 | `node --version` |
| pnpm | >= 9 | `pnpm --version` |

#### Installing pnpm (with or without Volta)

This repository pins **`pnpm@10.4.1+sha512...`** via the `packageManager` field in `package.json`.
If `pnpm --version` fails with `Volta error: Could not locate executable`, install it with one of the following.

**With Volta**

```bash
volta install pnpm@10.4.1
```

Volta resolves the pinned version from the shim. The error above appears when the pinned version is not
installed, so always `volta install` the same version.

**Without Volta**

```bash
# corepack (bundled with Node.js) fetches the pinned version automatically
corepack enable pnpm

# or install any version via npm
npm install -g pnpm@10.4.1
```

> **Note**: `package.json` lists `@tailwindcss/oxide` / `esbuild` / `workerd` in `pnpm.onlyBuiltDependencies`
> to unblock pnpm 10's default "build scripts are ignored" behavior. If `pnpm rebuild` is ever needed after
> install, those three packages are the target.

### 1. Clone the repository

```bash
git clone https://github.com/watanabe3tipapa/policy-insight-hub.git
cd policy-insight-hub
```

### 2. Install and run

```bash
pnpm install
pnpm dev        # Dev: http://localhost:3000
pnpm build && pnpm start   # Production: http://localhost:3000
```

### Demo mode (bypass auth for full app access / LP)

```bash
VITE_DEMO_MODE=true pnpm dev
```
- Auto-logs in as admin user "Demo User"
- Skips login screen; all pages accessible (Dashboard, Data Sources, Indicators, Reviews, Collection, Policy Essences, Data Exchange)
- **Local development only** — keep `false` for production builds/deploys

> **Note**: The landing page (`/`) alone does not allow actual hands-on experience (data entry, editing, chart interaction). Start with demo mode and navigate to `/dashboard` and beyond to try the features.

### 3. Enable authentication

Set the environment variables for the username + password login (see `.env.example`; fill in real values as needed):

```bash
export ADMIN_USERNAME=admin   # username that gets the admin role on first login
export JWT_SECRET=...         # Session JWT signing key (secret)
```

## Environment Variables

| Variable | Description |
|---|---|
| `ADMIN_USERNAME` | Username auto-created with the admin role on first login |
| `BUILT_IN_FORGE_API_URL` | Forge API URL (default `https://forge.manus.ai`) |
| `JWT_SECRET` | Session JWT signing key (secret; never commit) |
| `BUILT_IN_FORGE_API_KEY` | Forge API key (secret; never commit) |
| `PORT` | Preferred local server port (default 3000) |

## Client Build-time Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL (e.g. the Cloudflare Worker's `/api/trpc`; falls back to same-origin `/api/trpc`) |
| `VITE_BASE_PATH` | Static base for a custom domain (default `/policy-insight-hub/`) |
| `VITE_ANALYTICS_ENDPOINT` | Umami analytics endpoint (injected only when set at build time) |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami website ID (same) |
| `VITE_DEMO_MODE` | `true` to bypass auth and access all features as demo user (local development only) |

## Architecture

```
policy-insight-hub/
├── client/                 # React 19 SPA (served statically from GitHub Pages)
│   ├── src/
│   │   ├── pages/          # PolicyDashboard / DataSources / Indicators / Reviews /
│   │   │                   # KitesurfIntegration / PolicyEssences / DataExchange
│   │   ├── components/     # DashboardLayout / PageFrame / FreshnessBadge / ui (shadcn-style) etc.
│   │   ├── lib/            # trpc.ts / dataExchange.ts (SQLite .db exchange)
│   │   └── _core/          # hooks/useAuth.ts (password session)
│   └── public/             # 404.html (deep-link hash restore) / runtime/
├── server/                 # API (Cloudflare Worker + Node adapter sharing one fetch handler)
│   ├── _core/              # handler.ts / trpc.ts / context.ts / sdk.ts (JWT session) / env.ts / index.ts
│   ├── worker/index.ts     # Cloudflare Worker entry
│   ├── routers/            # policy / kitesurf / internationalPolicy
│   ├── db.ts               # D1 helpers (bindD1Database binding injection)
│   └── startupRefresh.ts   # startup stale detection + Kitesurf refresh
├── shared/                 # const.ts (cookie constants) / types.ts
├── drizzle/                # schema.ts / 0000_talented_blade.sql (migration)
├── scripts/                # capture-screens.mjs (visual verification)
└── docs/                   # design notes
```

## API

tRPC (`/api/trpc`):

| namespace | procedures | purpose |
|---|---|---|
| `system` | `health` / `notifyOwner` | health check / notify owner |
| `auth` | `me` / `login` / `logout` | session lookup / password login / logout |
| `policy.dataSources` | `list` / `create` / `update` | data registry |
| `policy.indicators` | `list` / `create` / `update` | indicator dictionary |
| `policy.indicators.observations` | `list` / `create` | time-series observations |
| `policy.reviews` | `list` / `create` / `update` / `delete` | review logs |
| `policy.reviews.actions` | `create` / `update` / `delete` | review actions |
| `kitesurf` | `config` / `startupAudit` / `saveConfig` / `updateRefreshSettings` / `runs` / `candidates` / `createRun` / `updateRun` / `createCandidate` / `updateCandidate` | collection & startup refresh |
| `internationalPolicy.sources` | `list` / `create` | international policy sources |
| `internationalPolicy.essences` | `list` / `create` | policy essences |
| `internationalPolicy.contexts` | `upsert` | social context |
| `internationalPolicy.reviews` | `upsert` | evaluation reviews |

Other HTTP routes:

| Endpoint | Purpose |
|---|---|
| `/manus-storage/*` | storage proxy |

## Cloudflare Worker Integration

policy-insight-hub runs on **GitHub Pages (SPA) + Cloudflare Workers (API) + Cloudflare D1 (SQLite)**.

- **Startup stale refresh**: only when the last success is older than `staleAfterHours`, the server calls
  the Kitesurf Worker's `POST /collect` on startup. A 15-minute lease prevents duplicate runs, and the
  audit state (`lastStartupCheckAt` / `lastStartupOutcome` / `lastStartupMessage`) is saved to D1 and
  reflected on the management screen
- **wrangler.toml**: `server/worker/index.ts` is set as `main`. Enable the D1 binding by pasting the
  `database_id` returned by `wrangler d1 create policy-insight-hub`
- **Secrets**: `JWT_SECRET` and `BUILT_IN_FORGE_API_KEY` are never committed; set them
  with `wrangler secret put`

```bash
pnpm worker:dev       # develop the Worker locally
pnpm worker:deploy    # deploy the Worker
pnpm db:migrate       # apply migrations to D1 (--remote)
```

## Documentation

- [DEV-MEMO](DEV-MEMO.md) — development memo (tech stack, configuration values, implementation history)

## Testing

```sh
pnpm check        # type check (tsc --noEmit)
pnpm test         # Vitest (27 tests: business API / startup refresh / migration replay / data exchange)
pnpm screenshot   # Playwright visual verification of every page (output to screenshots/)
```

## License

MIT License. See [LICENSE](LICENSE) for details.

## Contact

GitHub: [https://github.com/watanabe3tipapa/policy-insight-hub](https://github.com/watanabe3tipapa/policy-insight-hub)