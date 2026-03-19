# QC-EVIDENCE.md — Automations

---

## 2026-03-19 — Phase 1 Foundation (Test)

**Commit:** cc85646 (fix static path)
**Environment:** Test
**URL:** https://automations-test.christianfransson.com
**Tested by:** Jarvis (automated)

### Commands run

```bash
# Health check (local)
curl -sf http://localhost:8094/api/health
# → {"status":"ok"}

# Execute endpoint (local, httpbin)
curl -s -X POST http://localhost:8094/api/execute \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/get","method":"GET"}'
# → {"status":200,"headers":{...},"body":"..."}

# Public health check (via Cloudflare tunnel)
curl -sf https://automations-test.christianfransson.com/api/health
# → {"status":"ok"}

# Frontend serving (local)
curl -sf http://localhost:8094/
# → HTML from Vite React build
```

### Flows checked

- [x] Docker test container builds cleanly (multi-stage)
- [x] Encryption key bootstrapped to volume
- [x] Server starts without errors (clean logs)
- [x] GET /api/health → 200 {"status":"ok"}
- [x] POST /api/execute → 200 with upstream response (httpbin)
- [x] Frontend SPA served from / (HTML response)
- [x] Public test URL reachable via Cloudflare tunnel

### Issues found and fixed

1. `@fastify/cors@9` incompatible with Fastify v5 → upgraded to v10 (commit 2f8f46f)
2. Static plugin path `../../../client/dist` incorrect → fixed to `../client/dist` (commit cc85646)

### Unit tests

All 16 unit tests passing (vitest run in server/)

### Result

**PASS** — test environment ready for Phase 1 checkpoint verification

### Production

Not yet deployed (Phase 1 only sets up foundation — no UI to verify in prod yet)
