---
phase: 01-foundation
plan: "04"
subsystem: infra
tags: [docker, docker-compose, fastify-static, multi-stage-build, spa-serving, volumes]

# Dependency graph
requires:
  - phase: 01-03
    provides: Fastify server with health + execute routes wired in index.ts

provides:
  - Multi-stage Dockerfile building Vite client and Fastify server into a single runtime image
  - docker-compose.yml with test (port 8094) and prod (port 8095) services, isolated named volumes
  - @fastify/static plugin serving the Vite SPA with React Router fallback (NODE_ENV=production only)
  - Human-verified smoke test confirming both health endpoints return 200 on respective ports

affects:
  - All future phases (deployment target established)
  - Phase 2 (Transform + Builder UI — same Docker stack)
  - Phase 3 (AI + CRUD — same Docker stack)
  - Phase 4 (Scheduling — same Docker stack)

# Tech tracking
tech-stack:
  added:
    - Docker multi-stage build (node:22-alpine)
    - @fastify/static v5 (serving client/dist in production)
    - @fastify/cors v10 (Fastify v5 compatible — upgraded from v9)
  patterns:
    - Static plugin registered AFTER all API routes to prevent catch-all shadowing
    - NODE_ENV guard in static plugin — dev never serves static files
    - Isolated named volumes per environment (test-secrets, test-db, prod-secrets, prod-db)
    - Docker profiles for explicit environment selection (--profile test | --profile prod)

key-files:
  created:
    - Dockerfile
    - docker-compose.yml
    - server/src/plugins/static.ts
  modified:
    - server/src/index.ts (staticPlugin registered after executeRoute)
    - server/package.json (@fastify/cors upgraded to v10)

key-decisions:
  - "Static plugin path uses ../client/dist relative to __dirname (/app/dist) — not ../../../ as in plan interface example"
  - "@fastify/cors upgraded from v9 to v10 for Fastify v5 compatibility (v9 peer-dep mismatch caused startup failure)"
  - "test-secrets and prod-secrets are separate named volumes — prevents encryption key bleed between environments"

patterns-established:
  - "Pattern: Docker Compose profiles — `--profile test` for port 8094, `--profile prod` for port 8095"
  - "Pattern: Static plugin always last — all /api/* routes registered first, catch-all SPA fallback last"
  - "Pattern: Volume-backed secrets — /app/data/secrets/key never baked into image"

requirements-completed:
  - REQ-06

# Metrics
duration: ~45min
completed: 2026-03-19
---

# Phase 1 Plan 04: Docker Infrastructure Summary

**Multi-stage Dockerfile + docker-compose.yml delivering a single-command full-stack deployment with isolated volume-backed encryption keys per environment, verified on ports 8094 (test) and 8095 (prod)**

## Performance

- **Duration:** ~45 min (includes debugging two blocking issues)
- **Started:** 2026-03-19
- **Completed:** 2026-03-19
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 5

## Accomplishments

- Multi-stage Dockerfile builds the Vite client and Fastify server into a lean node:22-alpine runtime image
- docker-compose.yml brings up the full stack in one command with isolated test/prod volumes and no key bleed
- @fastify/static plugin serves the SPA fallback in production with React Router support, without shadowing API routes
- Human-verified: both `/api/health` endpoints returned `{"status":"ok"}` on ports 8094 and 8095, and POST `/api/execute` successfully proxied to httpbin

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Dockerfile (multi-stage) and docker-compose.yml** - `f3d34ef` (feat)
2. **Task 2: Register @fastify/static plugin in server** - `2e28bf2` (feat)
3. **Task 3: Smoke test — verify health endpoints on both Docker ports** - human-verified (approved)

**Deviation fixes:**
- `2f8f46f` — fix(server): upgrade @fastify/cors to v10 for Fastify v5 compatibility
- `cc85646` — fix(static): use ../client/dist — __dirname is /app/dist, client is at /app/client/dist

## Files Created/Modified

- `Dockerfile` — Multi-stage build: node:22-alpine builds client (Vite), server (tsup), runtime copies both
- `docker-compose.yml` — Two services (app-test/app-prod) with Docker profiles, isolated named volumes, restart policy
- `server/src/plugins/static.ts` — Fastify plugin: NODE_ENV guard, registers @fastify/static, SPA 404 fallback
- `server/src/index.ts` — staticPlugin registered last, after health + execute routes
- `server/package.json` — @fastify/cors bumped from v9 to v10

## Decisions Made

- Static plugin path is `../client/dist` relative to the compiled `__dirname` (`/app/dist`), not the three-level path shown in the plan's interface example. The plan example assumed a different directory structure.
- @fastify/cors v10 required — v9 has a peer dependency mismatch with Fastify v5 that causes a startup error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @fastify/cors v9 incompatible with Fastify v5**
- **Found during:** Task 1/2 (first Docker build and startup)
- **Issue:** @fastify/cors v9 peer dep declares compatibility with Fastify v4; startup emitted a critical peer-dep warning that caused request handling to fail
- **Fix:** Upgraded @fastify/cors from v9 to v10 in server/package.json
- **Files modified:** server/package.json, server/package-lock.json
- **Verification:** Container started cleanly, no peer-dep errors in logs
- **Committed in:** `2f8f46f`

**2. [Rule 1 - Bug] Static plugin path was wrong (three levels up instead of one)**
- **Found during:** Task 2 smoke test — frontend returned 404
- **Issue:** Plan interface showed `join(__dirname, '../../../client/dist')` but at runtime `__dirname` resolves to `/app/dist`; the client build is at `/app/client/dist` (one `..` away)
- **Fix:** Changed path to `join(__dirname, '../client/dist')`
- **Files modified:** server/src/plugins/static.ts
- **Verification:** Frontend served correctly from `/`; SPA route fallback working
- **Committed in:** `cc85646`

---

**Total deviations:** 2 auto-fixed (1 blocking dependency issue, 1 path bug)
**Impact on plan:** Both fixes essential for correct operation. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. Key generation for volumes is self-contained via Docker run command documented in docker-compose.yml comments.

## Next Phase Readiness

- Full Docker infrastructure established — Phase 2 (Transform + Builder UI) can build on this stack immediately
- Both environments (test on 8094, prod on 8095) operational and smoke-tested
- Encryption key isolation confirmed — test and prod secrets never share a volume
- All Phase 1 success criteria met: Docker Compose up, health endpoint 200 on both ports, SPA served, keys isolated

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
