# Project Research Summary

**Project:** Automations — Personal API Automation Tool
**Domain:** Server-side API proxy + XSLT/Liquid transformation + AI-assisted template generation + background scheduling + encrypted credential storage
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

This is a self-hosted personal automation tool that sits between the user and third-party REST APIs. The core loop is: configure a request, execute it, receive a raw response, apply an XSLT or Liquid template to transform the response into a useful output, save the configuration, and optionally schedule it to run unattended. The primary differentiator is AI-assisted template generation: the user describes the desired output in natural language and Claude Sonnet 4-6 produces working XSLT or Liquid from the actual API response. Research confirms this architecture is well-precedented — it closely resembles Azure Logic Apps XSLT/Liquid map integration, with scheduling semantics similar to n8n but scoped down to a single-user personal tool.

The recommended approach is a React + Fastify monorepo with SQLite persistence, node-cron scheduling, Saxon-JS for XSLT 3.0, and liquidjs for Liquid templates. All external API requests must be proxied server-side — API keys must never touch the browser. Credentials are AES-256-GCM encrypted at rest using Node.js built-in crypto. The entire stack is pure JavaScript/TypeScript with no native bindings except better-sqlite3, which must be compiled for the target Docker architecture. All versions are verified current as of 2026-03-19.

The dominant risks are: (1) JSON-to-XML conversion producing unexpected Saxon output that breaks AI-generated stylesheets, (2) encryption key loss permanently destroying all stored credentials, (3) node-cron timezone mismatches in Docker containers defaulting to UTC, and (4) prompt injection via attacker-controlled API responses. None of these are blocking, but all require deliberate preventive design in their respective phases. The AI transformation architecture must be decided early: scheduled runs should execute pre-saved templates — they must never call Claude at runtime, both for cost and rate-limit reasons.

## Key Findings

### Recommended Stack

The stack is opinionated and well-justified. Frontend is React 19 + Vite 8 + Tailwind CSS 4 + shadcn/ui with CodeMirror 6 for the XSLT/Liquid editors. CodeMirror is strongly preferred over Monaco because multiple editor instances on a single page (raw vs. transformed output) are architecturally clean in CodeMirror and awkward in Monaco, and the bundle footprint is 300KB vs. 5-10MB. Backend is Fastify 5.8.2 on Node.js 20 LTS — Fastify v5 reached GA in March 2026, has native TypeScript types, and the plugin ecosystem (cors, multipart, static) matches Fastify major versions exactly. All Fastify plugins must match major version 5.

**Core technologies:**
- Vite 8.0.1 + React 19.2.4 + TypeScript 5.x: frontend build and UI — standard for shadcn/ui; concurrent features improve split-pane responsiveness
- Tailwind CSS 4.2.2 + shadcn/ui (CLI): styling and accessible components — v4 required alongside Vite's Tailwind plugin; shadcn components are copied into the project, not installed
- @uiw/react-codemirror (CodeMirror 6): XSLT/Liquid code editors — modular, multiple instances, XML language support, 300KB bundle
- Fastify 5.8.2 + Node.js 20 LTS: backend HTTP server — v5 GA, Node 20 required by both Fastify v5 and @anthropic-ai/sdk
- saxon-js 2.7.0: XSLT 3.0 server-side execution — stable GA (SaxonJS 3 is still beta; do not use); pure JS, no native deps
- liquidjs 10.25.0: Liquid template rendering — AST-based, no eval, Shopify-compatible, actively maintained
- xml-js 1.6.11: JSON-to-XML bridge for the XSLT path — bidirectional, pure JS; js2xmlparser as fallback for namespace control
- better-sqlite3 12.8.0: synchronous SQLite for automation metadata + schedules + encrypted credentials — ACID transactions, no server process; must be compiled against the Docker base image architecture (node:20-alpine consistently)
- node-cron 4.2.1: in-process cron scheduler — no Redis required; schedule config persists in SQLite and is reloaded on boot
- @anthropic-ai/sdk 0.80.0: Claude API — official SDK with retries, streaming, TypeScript types; model is claude-sonnet-4-6
- zod 4.3.6: runtime schema validation for all API request bodies

### Expected Features

Research distinguishes three feature tiers clearly. The feature dependency graph is explicit: HTTP execution must exist before transformation, transformation must exist before AI generation, save/load must exist before scheduling, and scheduling must exist before output archiving has meaning.

**Must have (table stakes):**
- Request Builder (URL, method, headers, body, auth key input) — entry point for everything
- HTTP Execution Engine (server-side proxy via undici) — API keys must never leave the backend
- Raw Response Viewer (status + body with JSON pretty-printing) — baseline debugging
- Transformation Engine (XSLT + Liquid, server-side) — core product value
- JSON-to-XML auto-conversion for XSLT path — transparent to the user; removes biggest XSLT adoption barrier
- Side-by-side raw + transformed output view — instant visual feedback loop
- AI Template Generation (NL → XSLT/Liquid via Claude) — primary differentiator; must be in v1
- AI "improve" button — iterative template refinement; rounds out the AI workflow
- Save / Load / Edit / Delete automations (CRUD) — persistence makes the tool real
- Encrypted credential storage (AES-256-GCM) — required before any API key touches disk
- Backend scheduling (interval, weekly, monthly, raw cron) — makes the tool autonomous
- Output file archive per automation (timestamped JSON files on Docker volume) — makes scheduled runs useful
- Browse + download saved outputs in-app — closes the scheduled-run feedback loop
- Schedule enable/disable toggle — pause without deleting

**Should have (competitive/differentiators):**
- Duplicate automation — faster variant creation
- Run history in-app (last N manual runs) — supports "what did this return last week?"

**Defer (v2+):**
- Webhook/event triggers — requires inbound infrastructure; scheduling covers the core use case
- Chained automations — becomes n8n; out of scope
- Output diff view — only if archive sees heavy use
- OAuth 2.0 dance — user pastes access token; tool treats it as a bearer key

**Deliberate anti-features (not built):** Multi-user/team sharing, test assertions, GraphQL/gRPC, environment variable substitution, real-time streaming.

### Architecture Approach

The architecture is a two-process monolith (React frontend + Fastify backend) behind a single Docker Compose service, with a named volume for SQLite and the output file archive. The frontend is served as static files by Fastify in production — single port, no nginx needed. The backend is structured as routes (HTTP concerns) + services (business logic) + db (SQLite singleton + migrations). All transformation execution happens server-side; the frontend only displays results. The scheduler is a singleton service that loads all enabled schedules from SQLite on Fastify startup and registers node-cron jobs. Schedule configuration is stored as canonical cron expressions in SQLite; human-readable schedule type (interval/weekly/monthly) is stored alongside for display only.

**Major components:**
1. Request Builder + HTTP Proxy (routes/execute.ts + services/executor.ts) — server-side HTTP proxy keeps API keys off browser; undici handles the upstream call
2. Transform Services (services/xslt.ts + services/liquid.ts) — Saxon-JS and liquidjs run server-side; JSON-to-XML bridge is transparent
3. Credential Store (services/credentials.ts) — AES-256-GCM encrypt/decrypt; plaintext API key never returned to frontend; masked sentinel on GET
4. Automation CRUD (routes/automations.ts + db/index.ts) — SQLite source of truth; slug generated at creation and never changed (filesystem path depends on it)
5. Scheduler Service (services/scheduler.ts) — node-cron job registry; loaded from SQLite on boot; in-memory Map of active tasks keyed by automation ID
6. AI Route (routes/ai.ts) — NL→template generation and "improve"; auth detection suggestion (not auto-applied); all calls server-to-server via Anthropic SDK
7. Output File Archive (services/archive.ts + routes/outputs.ts) — timestamped JSON files at data/outputs/<slug>/; directory listing API for the in-app browser
8. Frontend SPA (React + Vite) — request builder, transform editor (CodeMirror), automation list, scheduler config, file browser; served by Fastify static in production

### Critical Pitfalls

1. **JSON-to-XML conversion edge cases** — Saxon's json-to-xml() output uses generic `<map>`, `<string>`, `<array>` elements with `@key` attributes, not key-name-derived element names. AI-generated XSLT must target this vocabulary. Mitigation: include the Saxon JSON-XML data model in the Claude system prompt; validate intermediate XML before passing to user stylesheets; surface conversion errors with the original JSON for context.

2. **Encryption key loss / no versioning** — If the ENCRYPTION_KEY env var changes across deployments, all stored credentials become permanently unreadable — silently, until a scheduled run fails. Mitigation: store the key in a volume-backed file (data/secrets/key) that persists across redeployments; prefix stored blobs with a key version identifier (v1:) for future migration; add startup health check that decrypts a known test blob and refuses to start if it fails.

3. **node-cron timezone mismatch in Docker** — Docker containers default to UTC; node-cron defaults to process TZ. A schedule set for 09:00 local time fires at 09:00 UTC. Mitigation: set ENV TZ=Europe/Stockholm in Dockerfile AND pass timezone: 'Europe/Stockholm' in every cron.schedule() options object; add TZ to Docker Compose environment block.

4. **node-cron job overlap on slow automations** — If an automation takes longer than its schedule interval, a second instance fires while the first is running, causing concurrent file writes and upstream API hammering. Mitigation: maintain a per-automation running flag in a Map; skip execution and log a warning if the flag is set at tick time; enforce a configurable job timeout.

5. **Prompt injection via API response content** — API response bodies passed to Claude for template generation are attacker-controlled input. Mitigation: place API response content in the user turn with XML delimiters, instructions only in the system prompt; instruct Claude explicitly to treat the response as untrusted data; truncate responses to 4000 chars before sending; never auto-execute AI-generated templates without user review.

## Implications for Roadmap

Based on the component dependency graph in ARCHITECTURE.md and the feature dependency tree in FEATURES.md, the build order is dictated by clear sequential dependencies. No phase can be skipped without breaking downstream phases.

### Phase 1: Foundation — DB, Credentials, and HTTP Proxy

**Rationale:** Everything else depends on SQLite being up and API keys being stored securely. The HTTP execution proxy is the smallest useful unit — it proves the backend works and that API keys stay server-side. No UI needed beyond a minimal test harness.
**Delivers:** Working SQLite schema (automations + schedules tables), AES-256-GCM credential encrypt/decrypt with volume-backed key, Fastify server with CORS configured correctly, POST /api/execute proxy route with timeout handling.
**Addresses:** Encrypted credential storage (table stakes), HTTP execution engine (table stakes).
**Avoids:** Credential key loss pitfall (key file in named volume from day one), CORS misconfiguration pitfall (register @fastify/cors before any proxy plugin), proxy timeout pitfall (set configurable AbortSignal from the start).
**Research flag:** Standard patterns — skip phase research.

### Phase 2: Transformation Engine

**Rationale:** The transform layer is independent of CRUD and scheduling but is a prerequisite for AI template generation. Build and validate Saxon-JS + liquidjs before connecting AI on top. The JSON-to-XML edge cases must be resolved here, not discovered later.
**Delivers:** POST /api/transform route (XSLT + Liquid), transparent JSON-to-XML bridge using xml-js, error surface that parses Saxon error XML into human-readable messages, LiquidJS with outputEscape: 'escape' set and async render() used exclusively.
**Addresses:** Transformation Engine (table stakes), JSON-to-XML auto-conversion (table stakes), side-by-side output view (table stakes).
**Avoids:** JSON-to-XML conversion edge cases (tested with malformed/irregular API responses), LiquidJS XSS via innerHTML (escape enabled, output rendered in pre/code, never innerHTML).
**Research flag:** Standard patterns — skip phase research. Saxon JSON-XML data model is well-documented.

### Phase 3: Request Builder UI + Raw Response Viewer

**Rationale:** Frontend phase that wraps the Phase 1 executor and Phase 2 transform routes in a usable UI. With backend routes proven, the UI can be built and tested against real endpoints. Auth detection AI suggestion and manual override belong here, not in the AI phase.
**Delivers:** React frontend scaffolded (Vite + Tailwind + shadcn/ui + CodeMirror), Request Builder form (URL/method/headers/body/API key), POST /api/execute wired to UI, raw response viewer (status + pretty-print), auth placement dropdown (manual override), POST /api/ai/detect-auth for suggestion (not auto-applied).
**Addresses:** URL + method input, custom headers, request body editor, raw response viewer, auth placement (all table stakes).
**Avoids:** AI auth detection false positives (suggestion shown as suggestion with manual override; 401 errors surface "check auth placement" message).
**Research flag:** Standard patterns — skip phase research.

### Phase 4: Automation CRUD + Encrypted Save/Load

**Rationale:** Persistence layer. CRUD depends on Phase 1 (DB + credentials). With the request/transform loop working, saving and reloading an automation makes the tool non-throwaway.
**Delivers:** GET/POST/PUT/DELETE /api/automations, slug generation at creation (immutable), API key stored as AES-256-GCM ciphertext (never returned to frontend — masked sentinel on GET), automation list UI, open/edit/delete, startup health check that validates the encryption key.
**Addresses:** Save and name automations, list/open/edit/delete (table stakes), encrypted credential storage (table stakes).
**Avoids:** Returning decrypted keys to frontend (sentinel pattern), filesystem as primary data store (SQLite for all structured data).
**Research flag:** Standard patterns — skip phase research.

### Phase 5: AI Template Generation

**Rationale:** Depends on Phase 2 (transform engine, to execute and preview AI output) and Phase 3 (raw response in hand as context for the prompt). This is the primary differentiator and belongs in v1 but only after the transform layer is stable.
**Delivers:** POST /api/ai/generate (NL → XSLT/Liquid from raw response sample), POST /api/ai/improve (refine existing template), AI output loaded into CodeMirror editor with user confirmation before replacing existing content, exponential backoff with retry-after header for 429 responses, API response truncated and wrapped in XML delimiters before being sent to Claude.
**Addresses:** NL → XSLT/Liquid generation (differentiator), AI "improve" button (differentiator).
**Avoids:** Prompt injection (system prompt isolation + untrusted content in user turn + explicit instruction to ignore embedded instructions), Claude rate limiting (user-triggered only; scheduled runs never call Claude).
**Research flag:** Needs deeper phase research — Claude prompt engineering for XSLT/Liquid generation quality, Saxon JSON-XML vocabulary in the system prompt, and truncation strategy for large responses need refinement during implementation planning.

### Phase 6: Scheduling + Output Archive

**Rationale:** Scheduling depends on saved automations (Phase 4). Output archiving only has meaning with scheduling. The scheduler service, TZ configuration, job overlap guard, and output file structure all belong together.
**Delivers:** PUT /api/automations/:id/schedule (enable/disable, schedule type, cron expression), scheduler service singleton (init on boot from SQLite, Map of active tasks), node-cron with explicit TZ=Europe/Stockholm, job overlap guard (per-automation running flag + configurable timeout), per-automation output file archive at data/outputs/<slug>/, timestamped JSON files with request + response + transformed content.
**Addresses:** Backend scheduling (differentiator/table stakes), multiple schedule types (differentiator), output file archive (differentiator), schedule enable/disable toggle.
**Avoids:** Timezone mismatch (TZ set in Dockerfile, Compose env, and cron.schedule() options), job overlap (running flag + timeout), encryption key loss for scheduled runs (startup health check from Phase 4 catches this before any schedule fires), Claude rate limiting from scheduled runs (scheduled runs use saved templates exclusively — no Claude calls at runtime).
**Research flag:** Needs deeper phase research — node-cron timezone DST behaviour, job overlap guard implementation patterns, output file retention strategy (disk growth bounds).

### Phase 7: Output Browser UI + Polish

**Rationale:** Closes the scheduled-run loop in the UI. The file listing API depends on Phase 6. Polish pass covers UX pitfalls identified in research.
**Delivers:** GET /api/outputs/:automationId (paginated, newest-first, 50 per page), GET /api/outputs/:automationId/:filename (stream file), file browser UI component, last-run / next-run display on automation cards, transformation preview debounced (500ms), human-readable error messages for Saxon errors, "Replace current template?" confirmation before AI output replaces editor content, 504 response for proxy timeouts with human-readable message.
**Addresses:** Browse + download saved outputs in-app (differentiator).
**Avoids:** Loading all output files into memory (paginated listing), user loses manual template edits (confirmation dialog), Saxon error XML shown raw (extract meaningful message), "Last run" opacity gap (display last_run_at from schedules table).
**Research flag:** Standard patterns — skip phase research.

### Phase Ordering Rationale

- Phases 1-2 are backend-only and independent of each other's implementation order but both must complete before frontend work yields real results.
- Phase 3 (UI) can begin scaffolding in parallel with Phase 2 if team size allows, but cannot be functionally complete until Phase 1 + 2 are stable.
- Phase 4 (CRUD) cannot start before Phase 1 (DB schema) is final, because schema changes after CRUD is built require migration work.
- Phase 5 (AI) cannot start before Phase 2 (transforms) and Phase 3 (UI with raw response), because AI generation requires both the response as context and the transform engine to preview output.
- Phase 6 (scheduling) cannot start before Phase 4 (automations saved) — schedules reference automation IDs.
- Phase 7 (output browser) cannot start before Phase 6 (archive files exist).
- The slug (automation filesystem path) is immutable after Phase 4 creation — this constraint must be explicit in the Phase 4 implementation spec.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (AI Template Generation):** Claude prompt engineering for XSLT 3.0 and Liquid quality; Saxon JSON-XML data model vocabulary to embed in system prompt; truncation/sampling strategy for large API responses as Claude context.
- **Phase 6 (Scheduling):** node-cron DST behaviour validation (spring forward / fall back); job overlap guard implementation detail; output file retention policy to bound disk growth.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Fastify + SQLite + AES-256-GCM are well-documented; credential key file pattern is established.
- **Phase 2 (Transformation):** Saxon-JS and liquidjs have official docs; JSON-to-XML data model is specified in XSLT 3.0 spec.
- **Phase 3 (Request Builder UI):** React + Vite + shadcn/ui is the standard stack; auth detection is a UX pattern, not a novel algorithm.
- **Phase 4 (CRUD):** Standard REST CRUD over SQLite; encryption pattern is resolved in Phase 1.
- **Phase 7 (Output Browser):** Directory listing + file streaming are standard Node.js patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version numbers verified directly from npm registry 2026-03-19; Fastify v5 GA confirmed; Saxon-JS 3 beta status confirmed via Saxonica blog |
| Features | HIGH | Feature set derived from competitor analysis (Postman, Insomnia, n8n) plus first-principles dependency graph; anti-features are justified by explicit complexity analysis |
| Architecture | HIGH | Component boundaries and data flows are well-established patterns; SQLite + node-cron for personal tools is documented; credential encryption pattern uses Node.js built-in crypto (no novel dependencies) |
| Pitfalls | HIGH (MEDIUM for auth detection) | Critical pitfalls verified against official docs and community issues; auth detection pitfall section is MEDIUM — insufficient prior art for AI-based auth inference quality assessment |

**Overall confidence:** HIGH

### Gaps to Address

- **Saxon JSON-XML vocabulary in Claude prompts:** The correct XPath patterns for matching Saxon's json-to-xml() output must be validated empirically during Phase 5. The system prompt for AI template generation must include concrete examples of what `<map>`, `<string>`, `<array>` with `@key` attributes look like, or AI-generated XSLT will frequently fail on first run.
- **SaxonJS 3 GA timeline:** SaxonJS 3.0-beta2 exists as of research date. If it reaches GA during development, the upgrade path from saxon-js 2.7.0 should be evaluated — but the upgrade should not be assumed in Phase planning.
- **Auth detection confidence calibration:** The AI auth detection feature has no prior art in the research. The suggestion-not-auto-apply UI pattern is the correct mitigation, but the actual model accuracy for query-param vs. header APIs is unknown and should be validated with real APIs (OpenWeatherMap, Google Maps) during Phase 3 QC.
- **Output file retention policy:** No retention limit is defined. For automations scheduled every minute, this is 525,600 files per year. A retention/cleanup setting (delete files older than N days, or keep last N per automation) should be scoped in Phase 6 or Phase 7.

## Sources

### Primary (HIGH confidence)
- npm registry direct queries (2026-03-19) — all version numbers: Vite 8.0.1, React 19.2.4, Fastify 5.8.2, saxon-js 2.7.0, liquidjs 10.25.0, better-sqlite3 12.8.0, node-cron 4.2.1, @anthropic-ai/sdk 0.80.0, zod 4.3.6, xml-js 1.6.11
- [Saxonica SaxonJS product page](https://www.saxonica.com/saxonjs/index.xml) — stable vs. beta status of Saxon-JS 2 and 3
- [LiquidJS sync and async guide](https://liquidjs.com/tutorials/sync-and-async.html) — async filter / renderSync() pitfall
- [LiquidJS options reference](https://liquidjs.com/tutorials/options.html) — outputEscape option
- [Claude API rate limits documentation](https://platform.claude.com/docs/en/api/rate-limits) — 429 retry-after behaviour
- [Anthropic prompt injection research](https://www.anthropic.com/research/prompt-injection-defenses) — indirect prompt injection attack class
- [CVE-2025-54794 indirect prompt injection in Claude](https://cymulate.com/blog/cve-2025-547954-54795-claude-mcp/) — documented attack surface
- [Fastify CORS plugin](https://github.com/fastify/fastify-cors) — plugin registration order
- [Balisage: XSLT Extensions for JSON Processing](https://balisage.net/Proceedings/vol27/html/Kay01/BalisageVol27-Kay01.html) — Saxon JSON-XML data model (authored by Michael Kay, Saxonica lead)
- [node-cron npm](https://www.npmjs.com/package/node-cron) — no native persistence confirmation

### Secondary (MEDIUM confidence)
- [Better Stack: Node schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) — node-cron vs. BullMQ tradeoffs
- [Sourcegraph: Migrating Monaco to CodeMirror](https://sourcegraph.com/blog/migrating-monaco-codemirror) — bundle size data for editor choice
- [Handling Timezone Issues in Cron Jobs 2025](https://cronmonitor.app/blog/handling-timezone-issues-in-cron-jobs) — DST behaviour
- [Nearform: Handling HTTP timeouts in Fastify](https://nearform.com/digital-community/handling-http-timeouts-in-fastify/) — timeout configuration
- [Saxon transform performance for large XML files — Saxonica community](https://saxonica.plan.io/boards/3/topics/5946) — memory characteristics
- [Azure Logic Apps XSLT + Liquid transformation](https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-enterprise-integration-maps) — precedent for XSLT + Liquid in automation tooling
- [Postman Authorization Docs](https://learning.postman.com/docs/sending-requests/authorization/authorization) — competitor auth patterns
- [n8n vs Zapier 2026](https://hatchworks.com/blog/ai-agents/n8n-vs-zapier/) — competitor scheduling patterns

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
