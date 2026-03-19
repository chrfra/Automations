---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x (server unit tests) |
| **Config file** | `server/vitest.config.ts` — Wave 0 gap |
| **Quick run command** | `cd server && npx vitest run --reporter=dot` |
| **Full suite command** | `cd server && npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npx vitest run --reporter=dot`
- **After every plan wave:** Run `cd server && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | REQ-01 | unit | `cd server && npx vitest run tests/execute.test.ts -t "validates URL"` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | REQ-02 | unit | `cd server && npx vitest run tests/execute.test.ts -t "validates method"` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | REQ-03 | unit | `cd server && npx vitest run tests/proxy.test.ts -t "forwards headers"` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 0 | REQ-04 | unit | `cd server && npx vitest run tests/proxy.test.ts -t "forwards body"` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 0 | REQ-05 | unit | `cd server && npx vitest run tests/crypto.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-06 | 01 | 0 | REQ-06 | unit | `cd server && npx vitest run tests/proxy.test.ts -t "passthrough"` | ❌ W0 | ⬜ pending |
| 1-health | 01 | 1 | health | smoke | `curl -f http://localhost:8094/api/health` | manual | ⬜ pending |
| 1-crypto | 01 | 1 | REQ-05 | unit | `cd server && npx vitest run tests/crypto.test.ts -t "round-trip"` | ❌ W0 | ⬜ pending |
| 1-startup | 01 | 1 | REQ-03 | unit | `cd server && npx vitest run tests/startup.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/vitest.config.ts` — Vitest config with path alias support
- [ ] `server/tests/crypto.test.ts` — encrypt/decrypt round-trip, key load failure
- [ ] `server/tests/proxy.test.ts` — upstream call passthrough, timeout, 502 mapping
- [ ] `server/tests/execute.test.ts` — Fastify route validation (400 cases)
- [ ] `server/tests/startup.test.ts` — missing key → process.exit(1) behaviour
- [ ] Framework install: `cd server && npm install --save-dev vitest @vitest/coverage-v8`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /api/health returns 200 on ports 8094/8095 | (health check) | Requires running Docker stack | `docker compose --profile test up -d && curl -f http://localhost:8094/api/health` |
| Docker Compose single-command startup | (docker) | Integration environment required | `docker compose --profile test up --build -d` and verify no errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
