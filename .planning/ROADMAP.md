# Roadmap: API Automations

**Project:** API Automations — Personal API automation with AI-assisted XSLT/Liquid transformation
**Defined:** 2026-03-19
**Granularity:** Coarse (4 phases)
**Coverage:** 27/27 requirements mapped

---

## Phases

- [ ] **Phase 1: Foundation** — Backend skeleton: Fastify + SQLite + encrypted credentials + HTTP proxy
- [ ] **Phase 2: Transform Engine + Request Builder UI** — Full workflow in browser: build request, execute, transform, view side-by-side
- [ ] **Phase 3: AI Features + Automation CRUD** — AI template generation, save/load/edit/delete/duplicate automations
- [ ] **Phase 4: Scheduling + Output Archive** — Background scheduler, output file archive, in-app file browser

---

## Phase Details

### Phase 1: Foundation
**Goal**: The backend can securely proxy any API request — credentials are encrypted at rest and API keys never leave the server.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. A POST to /api/execute with a URL, method, headers, body, and API key returns the upstream HTTP status, response headers, and body from the real API.
  2. An API key submitted with a request is stored in memory for the duration of the call but never written to disk in plaintext — the SQLite schema uses AES-256-GCM ciphertext when persisting credentials.
  3. The encryption key is stored in a volume-backed file (data/secrets/key) and a startup health check refuses to start the server if the key is missing or cannot decrypt a test blob.
  4. Docker Compose brings up the stack with a single command and the /api/health endpoint returns 200 on both test (8094) and prod (8095) ports.
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Test scaffold: Vitest config + 4 test files covering all 6 requirements
- [ ] 01-02-PLAN.md — Project scaffold: crypto.ts, db.ts, proxy.ts + Vite client placeholder
- [ ] 01-03-PLAN.md — API routes: POST /api/execute + GET /api/health wired in Fastify
- [ ] 01-04-PLAN.md — Docker: multi-stage Dockerfile + docker-compose.yml + smoke test checkpoint

### Phase 2: Transform Engine + Request Builder UI
**Goal**: A user can open the app, configure an API request, execute it, write a transformation, and see the raw response and transformed output side-by-side in real time.
**Depends on**: Phase 1
**Requirements**: REQ-07, REQ-08, REQ-11, REQ-12
**Success Criteria** (what must be TRUE):
  1. User can select XSLT or Liquid as the transform type and write a template in a syntax-highlighted code editor; clicking Execute + Transform shows the result in the right panel.
  2. When the upstream API returns JSON, it is silently converted to XML before Saxon-JS processes it — the user sees a transformed result without any manual conversion step.
  3. Raw response (HTTP status + body with JSON pretty-printing) and transformed output appear side-by-side in the same view without page navigation.
  4. Saxon and LiquidJS errors are surfaced as human-readable messages (not raw error XML or stack traces) so the user can correct the template.
  5. The Request Builder form accepts URL, method (GET/POST/PUT/PATCH/DELETE), custom headers as key/value pairs, and a request body (body field shown only for POST/PUT/PATCH).
**Plans**: TBD

### Phase 3: AI Features + Automation CRUD
**Goal**: The user can describe a transformation in plain English, have AI generate or refine the template, and save the full configuration as a named automation that persists across sessions.
**Depends on**: Phase 2
**Requirements**: REQ-05, REQ-09, REQ-10, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17
**Success Criteria** (what must be TRUE):
  1. User can paste an API key and see an AI-suggested auth placement (Bearer header, named header, or query param) as a one-click confirmation — not auto-applied; the user can override manually.
  2. User can type a natural-language description of the desired transformation and click Generate — a valid XSLT or Liquid template appears in the editor within the response time limit.
  3. User can click Improve with a natural-language instruction and the existing template is refined in-place (with a "Replace current template?" confirmation before overwriting).
  4. User can name and save an automation; reloading the app shows the automation in the list with all fields (endpoint, method, headers, transform type, template) restored — and the API key is masked but usable.
  5. User can open, edit, re-save, delete (with confirmation), and duplicate any saved automation.
**Plans**: TBD

### Phase 4: Scheduling + Output Archive
**Goal**: A saved automation can run on a schedule automatically and the user can browse, view, and download the saved output files from within the app.
**Depends on**: Phase 3
**Requirements**: REQ-18, REQ-19, REQ-20, REQ-21, REQ-22, REQ-23, REQ-24, REQ-25, REQ-26, REQ-27
**Success Criteria** (what must be TRUE):
  1. User can enable a schedule toggle on any saved automation and set the schedule type (Interval, Weekly, Monthly, or Advanced cron) plus a start date/time in local time — the scheduler fires at the configured time without calling Claude.
  2. If a scheduled run is still in progress when the next tick fires, the second run is skipped and a warning is logged — no concurrent execution of the same automation.
  3. After every manual or scheduled run, the output (raw response + transformed result) is shown in the app and the user can save it to a timestamped file with one click.
  4. Each automation has a dedicated subfolder at data/outputs/<automation-slug>/ and the user can browse the saved files for any automation from within the app, then view or download any file.
  5. The user can enable or disable a schedule without deleting it — toggling off stops future runs; toggling back on resumes from the next scheduled tick.
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/4 | In Progress|  |
| 2. Transform Engine + Request Builder UI | 0/? | Not started | - |
| 3. AI Features + Automation CRUD | 0/? | Not started | - |
| 4. Scheduling + Output Archive | 0/? | Not started | - |

---

## Requirement Coverage

| Phase | Requirements |
|-------|-------------|
| Phase 1 | REQ-01, REQ-02, REQ-03, REQ-04, REQ-05 (backend: auth AI inference), REQ-06 |
| Phase 2 | REQ-07, REQ-08, REQ-11, REQ-12 |
| Phase 3 | REQ-05 (frontend: confirmation UI), REQ-09, REQ-10, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17 |
| Phase 4 | REQ-18, REQ-19, REQ-20, REQ-21, REQ-22, REQ-23, REQ-24, REQ-25, REQ-26, REQ-27 |

**Total mapped:** 27/27 (REQ-05 spans Phase 1 backend inference + Phase 3 frontend UI — counted once in Phase 3 as its user-visible delivery)

---

## Notes

- **REQ-05 split**: The backend AI auth detection call belongs in Phase 1 (server infrastructure), but the one-click confirmation UI that the user interacts with is delivered in Phase 3 alongside the full CRUD workflow. The requirement is assigned to Phase 3 because that is when it becomes observable to the user.
- **Research flags**: Phase 3 (AI template generation) and Phase 4 (scheduling) are flagged in research as needing deeper phase research during planning — Claude prompt engineering for XSLT/Liquid quality, and node-cron DST behaviour + overlap guard respectively.
- **Scheduled runs never call Claude**: Templates execute deterministically at runtime; AI is only available during interactive (manual) sessions.
- **Encryption key persistence**: From Phase 1, the key lives in a volume-backed file so it survives redeployments — this prevents the credential-loss pitfall for all future phases.

---
*Roadmap created: 2026-03-19*
