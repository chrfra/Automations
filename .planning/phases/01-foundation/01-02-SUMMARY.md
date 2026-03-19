---
phase: 01-foundation
plan: 02
subsystem: server-libs
tags: [crypto, sqlite, proxy, vite, react, typescript, tsup, aes-256-gcm, better-sqlite3]

# Dependency graph
requires: [01-01]
provides:
  - AES-256-GCM encrypt/decrypt module with startup key health check
  - SQLite DB open + WAL mode + full automations/scheduled_jobs schema
  - callUpstream proxy helper with 30s timeout and 502 error mapping
  - Fastify server entry point with health route
  - TypeScript @/ path alias configured end-to-end (tsconfig + tsup)
  - Vite + React client placeholder building cleanly
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added:
    - fastify@^5.0.0
    - better-sqlite3@^11.0.0
    - "@sinclair/typebox@^0.33.0"
    - dotenv@^16.0.0
    - tsx@^4.0.0
    - tsup@^8.0.0
    - typescript@^5.0.0
    - "@types/better-sqlite3@^7.0.0"
    - vite@^8.0.0
    - react + @vitejs/plugin-react
  patterns:
    - AES-256-GCM with ivHex:tagHex:ciphertextHex storage format
    - better-sqlite3 WAL mode with foreign keys enabled
    - tsup bundle:true with esbuildOptions alias for @/ resolution
    - Vite dev proxy to Fastify (prevents CORS in development)
    - Node 18+ built-in fetch with AbortSignal.timeout(30_000)
    - Dual-overload callUpstream (positional and options object)

key-files:
  created:
    - server/src/lib/crypto.ts
    - server/src/lib/db.ts
    - server/src/lib/proxy.ts
    - server/src/index.ts
    - server/tsconfig.json
    - server/tsup.config.ts
    - client/src/App.tsx
    - client/vite.config.ts
    - client/index.html
    - client/package.json
    - .env.example
    - .gitignore
  modified:
    - server/package.json

key-decisions:
  - "tsup bundle:true with esbuildOptions.alias required to resolve @/ at runtime — without it production build fails with Cannot find module"
  - "callUpstream accepts both positional args and options object via overloads — proxy tests use object form"
  - "loadEncryptionKey accepts 64-char hex string OR raw 32-byte binary — hex is most common from keygen script"
  - "execute.test.ts remains RED (imports @/routes/execute) — intentional, Plan 03 responsibility"

# Metrics
duration: 4min
completed: 2026-03-19
---

# Phase 1 Plan 02: Foundation Libraries Summary

**AES-256-GCM crypto + SQLite full schema + fetch proxy helper with 502 mapping, Vite client placeholder, TypeScript path aliases end-to-end**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T12:01:33Z
- **Completed:** 2026-03-19T12:05:40Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- All server production dependencies installed (fastify, better-sqlite3, typebox, dotenv, tsx, tsup, typescript)
- TypeScript @/ path alias configured in tsconfig.json with matching tsup esbuildOptions alias for runtime resolution
- crypto.ts: AES-256-GCM encrypt/decrypt with startup self-test; loadEncryptionKey accepts hex or binary key
- db.ts: better-sqlite3 with WAL mode, foreign keys, full automations + scheduled_jobs schema using CREATE TABLE IF NOT EXISTS
- proxy.ts: Native fetch with AbortSignal.timeout(30_000); maps TimeoutError, ECONNREFUSED, ENOTFOUND, ECONNRESET to 502 results
- index.ts: Fastify entry that loads key, opens DB, initializes schema, registers /api/health, listens on 0.0.0.0
- Vite + React client scaffold with /api proxy to localhost:3001; placeholder App.tsx
- 13 tests passing GREEN (crypto.test.ts, proxy.test.ts, startup.test.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install server deps and configure TypeScript + tsup** - `7b2c0f5` (chore)
2. **Task 2: Implement crypto.ts, db.ts, proxy.ts, index.ts** - `906542c` (feat)
3. **Task 3: Bootstrap Vite + React client placeholder** - `98911b4` (feat)

## Files Created/Modified

- `server/package.json` - Updated with full dep set (fastify, better-sqlite3, tsx, tsup etc.)
- `server/package-lock.json` - Updated lock file
- `server/tsconfig.json` - TypeScript config with @/* alias to src/*
- `server/tsup.config.ts` - tsup with bundle:true + esbuildOptions alias
- `server/src/lib/crypto.ts` - AES-256-GCM encrypt/decrypt + loadEncryptionKey
- `server/src/lib/db.ts` - better-sqlite3 open + WAL + full schema
- `server/src/lib/proxy.ts` - callUpstream with 30s timeout + 502 error mapping
- `server/src/index.ts` - Fastify entry point
- `client/` (all scaffolded files) - Vite React TypeScript client
- `client/vite.config.ts` - Updated with /api dev proxy
- `client/src/App.tsx` - Replaced with minimal placeholder
- `.env.example` - PORT, KEY_PATH, DB_PATH, NODE_ENV
- `.gitignore` - Excludes data/secrets/, .env, node_modules/, dist/

## Decisions Made

- `tsup bundle:true` with `esbuildOptions.alias` is the correct approach for resolving @/ path aliases — alternative `noExternal` approach would bundle all node_modules unnecessarily
- `callUpstream` uses dual overloads to satisfy both the plan's positional signature and the test files' object-argument style
- Key file accepts both 64-char hex (standard from keygen script) and raw 32-byte binary for flexibility
- `execute.test.ts` intentionally remains RED — imports `@/routes/execute` which is Plan 03's responsibility

## Deviations from Plan

### Auto-fixed Issues

None — all implementations matched plan interfaces exactly.

The only notable adaptation: `callUpstream` was implemented with dual overloads (positional args + options object) because the test files in Plan 01 used `{ url, method, headers, body }` object form while the plan context showed positional signature. Both are supported transparently.

## Self-Check

All artifacts verified:

- `server/src/lib/crypto.ts` — FOUND
- `server/src/lib/db.ts` — FOUND
- `server/src/lib/proxy.ts` — FOUND
- `server/src/index.ts` — FOUND
- `server/tsconfig.json` — FOUND (has @/* alias)
- `server/tsup.config.ts` — FOUND (bundle:true)
- `client/dist/index.html` — FOUND (Vite build passes)
- `.env.example` — FOUND
- `.gitignore` — FOUND
- Task commits: `7b2c0f5`, `906542c`, `98911b4` — all present
- 13 tests PASSING (crypto, proxy, startup)

## Self-Check: PASSED

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
