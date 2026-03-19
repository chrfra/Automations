---
phase: 01-foundation
plan: 01
subsystem: testing
tags: [vitest, typescript, tdd, test-scaffold, node]

# Dependency graph
requires: []
provides:
  - Vitest test runner configured with @ alias pointing to server/src
  - Failing test files for all 6 Phase 1 requirements (RED state)
  - crypto.test.ts covering AES-256-GCM encrypt/decrypt + key loading
  - proxy.test.ts covering upstream passthrough, header/body forwarding, 502 error mapping
  - execute.test.ts covering Fastify route validation (400) and delegation (200)
  - startup.test.ts covering process.exit(1) on missing/short key file
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added: [vitest@4.1.0, "@vitest/coverage-v8@4.1.0"]
  patterns: [TDD red-green cycle, flat test structure without describe blocks, vi.spyOn for process.exit, vi.mock for fetch]

key-files:
  created:
    - server/package.json
    - server/vitest.config.ts
    - server/tests/crypto.test.ts
    - server/tests/proxy.test.ts
    - server/tests/execute.test.ts
    - server/tests/startup.test.ts
  modified: []

key-decisions:
  - "Vitest 4.1 chosen — latest stable, ESM-native, compatible with Node ES modules"
  - "@ alias maps to ./src in vitest.config.ts to match tsconfig paths planned for Plan 02"
  - "Flat test structure (no describe blocks) per plan specification"
  - "process.exit mocked via mockImplementation throwing an Error for testability"

patterns-established:
  - "Test-first: test files precede all production code — every implementation task has a real verify target"
  - "Module alias: @/ prefix used throughout tests; resolves via vitest alias to server/src/"
  - "Error spy pattern: vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called') })"

requirements-completed: [REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06]

# Metrics
duration: 2min
completed: 2026-03-19
---

# Phase 1 Plan 01: Test Scaffold Summary

**Vitest 4.1 test scaffold with 4 failing test files covering all 6 Phase 1 requirements, using @ alias pre-wired to server/src**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T12:57:17Z
- **Completed:** 2026-03-19T12:59:24Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Vitest installed and configured with ESM + @ path alias matching future tsconfig paths
- 4 test files written covering all Phase 1 behaviors across crypto, proxy, route validation, and startup
- All tests fail RED with "Cannot find module" (not config errors) — correct pre-implementation state
- Every subsequent implementation task in Phase 1 has a real `npx vitest run` verify target

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest and create vitest.config.ts** - `d3877ce` (chore)
2. **Task 2: Write failing test files for all 6 requirements** - `4913bbe` (test)

## Files Created/Modified

- `server/package.json` - Server package with test scripts and ESM module type
- `server/package-lock.json` - Lock file from npm install
- `server/vitest.config.ts` - Vitest config with @ alias pointing to ./src
- `server/tests/crypto.test.ts` - AES-256-GCM round-trip, wrong-key throw, key load failure tests
- `server/tests/proxy.test.ts` - Upstream passthrough, header/body forwarding, TimeoutError/ECONNREFUSED/ENOTFOUND 502 mapping
- `server/tests/execute.test.ts` - Fastify inject tests: missing URL (400), unsupported method (400), valid payload (200)
- `server/tests/startup.test.ts` - process.exit(1) on missing key file and short key file

## Decisions Made

- Used Vitest 4.1 (installed as latest stable) with @vitest/coverage-v8 for future coverage reporting
- Flat test structure (no describe blocks) as specified in plan
- `vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called') })` pattern for testing process.exit calls
- @ alias pre-configured in vitest.config.ts to align with tsconfig paths that Plan 02 will define

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — vitest ran cleanly after install, all 4 test files fail with import errors as expected (RED state).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Test scaffold is complete; Plans 02-04 can run `cd server && npx vitest run` as their automated verify command
- All 4 test files will turn green as implementation progresses through subsequent plans
- No blockers

---
*Phase: 01-foundation*
*Completed: 2026-03-19*
