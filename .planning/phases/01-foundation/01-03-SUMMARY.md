---
phase: 01-foundation
plan: 03
subsystem: api
tags: [fastify, typebox, proxy, typescript, vitest, routes, validation]

# Dependency graph
requires:
  - phase: 01-02
    provides: callUpstream proxy helper, crypto/db libs, Fastify entry point scaffold
provides:
  - POST /api/execute proxy endpoint with TypeBox schema validation and 502 error mapping
  - GET /api/health route as fastify-plugin
  - ExecuteBody, ExecuteResponse, ErrorResponse TypeBox schemas
  - buildApp() test factory in execute.ts for inject()-based testing
  - Validation error normalizer: Fastify schema errors mapped to { error, detail } shape
  - index.ts with correct startup sequence: key → db → cors → routes → errorHandler → listen
affects: [01-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TypeBox schema-first route validation with Fastify (body + response schemas)
    - buildApp() factory pattern for route testing without spinning up a full server
    - fastify-plugin (fp()) wrapping for correct scope in plugin registration
    - Validation error normalizer via setErrorHandler to normalize Fastify's default format
    - apiKey → Authorization Bearer injection before upstream call (Phase 3 will extend)

key-files:
  created:
    - server/src/schemas/execute.ts
    - server/src/routes/execute.ts
    - server/src/routes/health.ts
  modified:
    - server/src/index.ts

key-decisions:
  - "buildApp() factory exported alongside fp() plugin — test file expects named export, plugin export for index.ts registration"
  - "Route handler duplicated inside buildApp() to keep plugin and test factory self-contained — acceptable at Phase 1 scale"
  - "Validation error normalizer added in both buildApp() and index.ts setErrorHandler for consistent { error, detail } shape"

patterns-established:
  - "TypeBox schema passed to Fastify route as { schema: { body, response } } — Fastify handles 400 automatically"
  - "buildApp() factory for unit-testing routes via app.inject() without real network calls"

requirements-completed: [REQ-01, REQ-02, REQ-03, REQ-04, REQ-06]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 1 Plan 03: Execute Route + Health Route Summary

**POST /api/execute proxy endpoint with TypeBox schema validation, 400/502 error normalization, and buildApp() test factory — all 16 Phase 1 unit tests passing green**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T12:08:15Z
- **Completed:** 2026-03-19T12:10:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- TypeBox schemas for ExecuteBody (url, method union, optional headers/body/apiKey), ExecuteResponse, and ErrorResponse
- POST /api/execute route: schema validation → callUpstream → 200 passthrough (including upstream non-2xx) or 502 on connection failure
- GET /api/health route returning { status: 'ok' } as fastify-plugin
- buildApp() test factory exported from execute.ts — tests use inject() for full Fastify stack testing without real HTTP
- index.ts updated: loadEncryptionKey → openDb+initSchema → cors → healthRoute → executeRoute → setErrorHandler → listen
- All 16 tests pass green (3 new execute tests + 13 from Plans 01-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TypeBox schemas and route files** - `8a86b70` (feat)
2. **Task 2: Wire routes into index.ts and add validation error normalizer** - `d6d4521` (feat)

## Files Created/Modified

- `server/src/schemas/execute.ts` - TypeBox ExecuteBody, ExecuteResponse, ErrorResponse schemas
- `server/src/routes/health.ts` - GET /api/health as fastify-plugin
- `server/src/routes/execute.ts` - POST /api/execute plugin + buildApp() test factory
- `server/src/index.ts` - Updated entry point with correct startup sequence and route registration

## Decisions Made

- `buildApp()` named export added alongside default `fp(executePlugin)` export — the test file was written expecting this factory pattern for inject()-based testing, while index.ts uses the plugin registration path. Both coexist cleanly.
- Handler logic is duplicated between the plugin and buildApp() to keep them independently testable. At Phase 1 scale this is a pragmatic choice; Phase 3+ can extract a shared handler if needed.
- `setErrorHandler` added in both `buildApp()` and `index.ts` to ensure the `{ error, detail }` error shape is consistent regardless of execution context.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Adaptation] buildApp() factory added to execute.ts**
- **Found during:** Task 1 (reading execute.test.ts)
- **Issue:** The plan showed a pure Fastify plugin pattern, but the existing test file imports `{ buildApp }` as a named export — a self-contained app factory for inject()-based testing.
- **Fix:** Implemented both: default export as `fp(executePlugin)` for index.ts, plus named `buildApp()` export for tests. The plan's interface block described the plugin shape which is honoured; buildApp() is additive.
- **Files modified:** server/src/routes/execute.ts
- **Verification:** All 3 execute tests pass, plugin still registers correctly in index.ts
- **Committed in:** 8a86b70 (Task 1 commit)

---

**Total deviations:** 1 auto-adapted (test contract alignment)
**Impact on plan:** Strictly additive — plugin pattern preserved, factory added to satisfy pre-existing test file. No scope creep.

## Issues Encountered

None — implementation matched plan interfaces. The only adaptation was the buildApp() factory pattern which was necessitated by the pre-existing test file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 server core is complete: encryption key loading, SQLite schema, proxy helper, and API routes are all wired and tested.
- Plan 04 (Docker + deployment) can register @fastify/static after routes in index.ts (TODO comment marks the insertion point).
- All Phase 1 REQ-01 through REQ-04 and REQ-06 satisfied.

## Self-Check: PASSED

All artifacts verified on disk:
- `server/src/schemas/execute.ts` — FOUND
- `server/src/routes/execute.ts` — FOUND
- `server/src/routes/health.ts` — FOUND
- `server/src/index.ts` — FOUND (updated)
- Task commits: `8a86b70`, `d6d4521` — both present

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
