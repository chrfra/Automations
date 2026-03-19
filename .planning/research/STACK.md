# Stack Research

**Domain:** Personal API automation tool (React + Fastify + XSLT/Liquid + scheduling + encrypted storage)
**Researched:** 2026-03-19
**Confidence:** HIGH (all versions verified directly from npm registry)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 8.0.1 | Frontend build tool | Fastest HMR in class; native TypeScript + React support; Docker-friendly static build output; standard choice for shadcn/ui projects |
| React | 19.2.4 | UI framework | Required by shadcn/ui; concurrent features improve perceived responsiveness of side-by-side transform panels |
| TypeScript | 5.x (bundled) | Type safety across frontend + backend | Single language both sides; catches shape mismatches between API response types and transform inputs at compile time |
| Tailwind CSS | 4.2.2 | Utility styling | v4 ships with cleaner imports than v3; required by shadcn/ui; zero-runtime CSS |
| shadcn/ui | latest (CLI) | Component library | Not a dependency — code is copied into project; full ownership; Radix UI primitives give accessible dialogs, dropdowns, tabs out of the box |
| Fastify | 5.8.2 | Backend HTTP framework | v5 GA (March 2026); targets Node.js 20+; 45–50k req/s; native TypeScript types; plugin system for multipart, CORS; correct fit for this workload |
| Node.js | 20 LTS | Runtime | Required by Fastify v5 and @anthropic-ai/sdk; LTS = supported through April 2026 |

### Transformation Layer

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| saxon-js | 2.7.0 | XSLT 3.0 processing on Node.js | Stable GA release (Oct 2024); free for use; handles XSLT 3.0 including streaming; accepts SEF (compiled stylesheets) for faster repeated execution. SaxonJS 3.0-beta2 exists but is preview-only — do not use in production |
| xslt3 | (CLI, not needed at runtime) | Compile XSLT source → SEF files | Companion to saxon-js; needed during development to pre-compile stylesheets; AI-generated XSLT gets compiled to SEF before execution |
| liquidjs | 10.25.0 | Liquid template engine | Pure JavaScript, no native bindings; AST-based (no eval); Shopify-compatible; actively maintained (published 11 days before research date); 4x faster render than v9 |
| xml-js | 1.6.11 | JSON → XML conversion for XSLT bridge | Bidirectional conversion; preserves element order; pure JavaScript; necessary because most APIs return JSON but Saxon requires XML input |

### Scheduling

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| node-cron | 4.2.1 | In-process cron scheduler | No Redis, no external dependencies; pure JavaScript; supports full crontab syntax plus interval/weekly/monthly patterns; `.start()` / `.stop()` API maps directly to the "enable/disable schedule" UX requirement; correct fit for a personal single-server tool |

**Why not BullMQ:** BullMQ requires Redis. For a personal tool with 1 server and no horizontal scale requirement, Redis is pure operational overhead. node-cron persists schedule configuration in SQLite (see below) and restarts jobs on boot — no persistence gap.

### Storage

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| better-sqlite3 | 12.8.0 | Automation metadata + schedule config + encrypted credentials | Synchronous API matches Fastify's plugin model cleanly; fastest SQLite binding for Node.js; file-based (no server process); single `.db` file survives Docker volume mounts trivially |
| Node.js built-in `crypto` | (built-in) | AES-256-GCM encryption of stored API keys | No dependency; standard pattern: `createCipheriv('aes-256-gcm', key, iv)` + random 12-byte IV per value + stored auth tag; key derived from `ENCRYPTION_KEY` env var |

**Storage schema:** Single SQLite file at `data/automations.db` (Docker volume). Tables: `automations` (metadata + encrypted credential blob), `schedules` (cron expression, enabled flag, start time), `runs` (execution log entries). Output files written to `data/outputs/<automation-name>/` (same volume).

**Why not file-based JSON:** JSON files have no transactional writes. Concurrent schedule runs could corrupt the file. SQLite with better-sqlite3 gives ACID transactions with zero infrastructure.

### AI Integration

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @anthropic-ai/sdk | 0.80.0 | Claude API (NL→XSLT/Liquid, auth detection) | Official SDK; full TypeScript types; streaming support; automatic retries; Node.js 20+ required (already met) |

**Model:** `claude-sonnet-4-6` as specified in PROJECT.md — correct for both the NL→template generation task (needs instruction-following quality) and auth detection (lightweight structured output).

### Code Editor (Frontend)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @uiw/react-codemirror | ~4.x | XSLT/Liquid editor in the UI | CodeMirror 6 is modular — ~300KB core vs Monaco's 5–10MB; supports XML/Liquid syntax highlighting via language extensions; multiple instances on the same page (raw vs transformed panels) without architectural issues; mobile-compatible |

**Why not Monaco:** Monaco is 5–10MB uncompressed and was designed as a single-instance editor (VS Code). Multiple Monaco instances on one page require workarounds. CodeMirror 6 is modular and handles this naturally.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/cors | 11.2.0 | CORS for frontend ↔ backend | Always — Vite dev server and Fastify run on different ports in development |
| @fastify/multipart | 9.4.0 | File upload support | If supporting template file imports |
| @fastify/static | latest | Serve frontend build from Fastify | Production: Fastify serves the React build as static files from a single process |
| zod | 4.3.6 | Runtime schema validation | Validate all API request bodies; generate TypeScript types from schemas; prevents malformed requests from reaching the XSLT/Liquid layer |
| js2xmlparser | 5.0.0 | Alternative JSON→XML with namespace support | Fallback if xml-js produces output Saxon cannot parse; js2xmlparser gives more control over root element naming |
| dotenv | latest | Environment variable loading | Load `ENCRYPTION_KEY`, `ANTHROPIC_API_KEY` in development; in Docker these come from compose env |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsx | TypeScript execution for backend | Run `server/index.ts` directly in development without a build step; faster than ts-node |
| eslint + @typescript-eslint | Linting | Enforce consistent types across frontend + backend |
| Playwright | Integration testing | Headed mode for QC (Chrome relay broken per CLAUDE.md — use localhost) |
| Docker Compose | Test + prod environments | Single `docker-compose.yml`, two services: `automations-test` (port 8094) and `automations-prod` (port 8095) |

---

## Installation

```bash
# Frontend (run from client/)
npm install react react-dom
npm install @uiw/react-codemirror @codemirror/lang-xml
npm install tailwindcss
# shadcn/ui — CLI-based, not an npm install
npx shadcn@latest init

# Backend (run from server/)
npm install fastify @fastify/cors @fastify/static @fastify/multipart
npm install saxon-js liquidjs xml-js js2xmlparser
npm install better-sqlite3
npm install node-cron
npm install @anthropic-ai/sdk
npm install zod
npm install dotenv

# Backend dev dependencies
npm install -D tsx typescript @types/node @types/better-sqlite3 @types/node-cron
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| node-cron | BullMQ | When you need distributed workers across multiple hosts, job persistence in Redis, or retry queues for critical tasks. Not needed here. |
| node-cron | Agenda | When you need MongoDB-backed persistence with job history. Overkill for a personal tool. |
| better-sqlite3 | Plain JSON files | Only if data is truly read-only config (never for automations with concurrent schedule runs) |
| better-sqlite3 | PostgreSQL | When multi-user or horizontal scale is required. Not in scope. |
| CodeMirror 6 (@uiw/react-codemirror) | Monaco (@monaco-editor/react) | When you need VS Code-level IntelliSense, integrated debugging, or full language server protocol. Adds 5–10MB to bundle. |
| saxon-js 2.7.0 | saxonjs-he 3.0.0-beta2 | When SaxonJS 3 reaches GA and has been stable for 3+ months. Not yet. |
| xml-js | js2xmlparser | When you need explicit namespace declarations or control over root element name — js2xmlparser gives more structure at the cost of slightly more verbose API |
| @anthropic-ai/sdk | Direct fetch to Claude API | Never — the SDK handles retries, streaming, and type safety. No reason to call raw. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `xslt4node` / `node-xslt` | Requires Java JVM or native LibXSLT bindings; breaks in Docker without extra setup; maintenance status unclear | `saxon-js` (pure JS, no native deps) |
| Bull (original) | Maintenance mode — only bug fixes, no new features | BullMQ (if you need Redis-backed queues at all) — or node-cron for this use case |
| `node-sqlite3` (the original) | Async callback API is awkward; slower than better-sqlite3; TryGhost fork has diverged | `better-sqlite3` |
| `liquid` (npm package by mvasilkov) | Minimal implementation, not Shopify-compatible, low adoption | `liquidjs` |
| React 18 | React 19 is current; shadcn/ui components target React 19 concurrent features | React 19.2.4 |
| Tailwind CSS v3 | v4 is current and has cleaner import syntax; v3 requires 3-line import boilerplate | Tailwind CSS v4 |
| Monaco editor for the XSLT/Liquid panels | 5–10MB bundle; global editor model makes multiple instances on one page architecturally awkward | CodeMirror 6 via @uiw/react-codemirror |
| Hardcoded encryption keys | Any key in source is a security failure — even for personal tools | `ENCRYPTION_KEY` env var, 32-byte random hex, set in Docker compose env or `.env` (gitignored) |
| eval() / Function() for template rendering | Both liquidjs and saxon-js avoid eval by design — don't bypass this with custom template logic | Use liquidjs `parseAndRender` / saxon-js `SaxonJS.transform` exclusively |

---

## Stack Patterns by Variant

**XSLT path (JSON API response):**
1. API response arrives as JSON string
2. `xml-js json2xml()` converts to XML string
3. Saxon-JS compiles XSLT to SEF (done once, cached)
4. `SaxonJS.transform({ stylesheetText: sef, sourceText: xmlStr, destination: 'serialized' })` returns transformed string

**XSLT path (XML API response):**
1. API response is already XML
2. Skip xml-js step
3. Pass directly to SaxonJS.transform

**Liquid path (any API response):**
1. API response (JSON or XML) passed as template variable
2. If JSON: parse to object, pass as `data` variable to liquidjs
3. If XML: optionally parse with xml-js to JS object first
4. `engine.parseAndRender(template, context)` returns rendered string

**AI generation path:**
1. User types natural language description
2. Backend sends to Claude with system prompt specifying XSLT 3.0 or Liquid syntax + the raw API response as context
3. Claude returns template text
4. Frontend loads template into CodeMirror editor
5. User can edit before running

**Schedule restart on boot:**
1. On Fastify startup, query SQLite for all `schedules WHERE enabled = 1`
2. Re-register each with node-cron using stored cron expression
3. Node-cron runs in-process — no external state needed

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Fastify 5.8.2 | Node.js 20+ | v5 dropped Node.js 18 support — do not use Node 18 in Docker image |
| @fastify/cors 11.2.0 | Fastify 5.x | Major version must match Fastify major |
| @fastify/multipart 9.4.0 | Fastify 5.x | Same — Fastify plugin versioning convention |
| @anthropic-ai/sdk 0.80.0 | Node.js 20+ | Explicitly requires non-EOL Node versions |
| better-sqlite3 12.8.0 | Node.js 20, 22 | Has native bindings — must be compiled for the Docker base image architecture (use `node:20-alpine` consistently) |
| Saxon-JS 2.7.0 | Node.js 14+ | No Node.js version constraint; avoids SaxonJS 3 beta |
| React 19 | Tailwind 4, shadcn/ui latest | React 18 components may have peer dep warnings with latest shadcn/ui |
| Tailwind 4 | Vite 6+ | Tailwind v4 uses Vite plugin (`@tailwindcss/vite`), not PostCSS config file |

---

## Sources

- npm registry direct queries (verified 2026-03-19) — all version numbers
- [fastify npm](https://www.npmjs.com/package/fastify) — v5.8.2, Node.js 20+ requirement
- [liquidjs npm](https://www.npmjs.com/package/liquidjs) — v10.25.0, AST-based, no eval
- [saxon-js npm](https://www.npmjs.com/package/saxon-js) — v2.7.0 stable; saxonjs-he 3.0.0-beta2 is preview only
- [Saxonica SaxonJS blog](https://blog.saxonica.com/announcements/2024/12/saxonjs-he-3.0.0-beta1.html) — confirmed beta status of SaxonJS 3 (MEDIUM confidence — beta may reach GA during development)
- [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3) — v12.8.0
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) — v0.80.0, Node.js 20+ requirement
- [node-cron npm](https://www.npmjs.com/package/node-cron) — v4.2.1, pure JS, no Redis
- [Better Stack: Node schedulers comparison](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/) — node-cron vs BullMQ tradeoffs (MEDIUM confidence — independent community source)
- [Sourcegraph: Migrating Monaco to CodeMirror](https://sourcegraph.com/blog/migrating-monaco-codemirror) — bundle size data for editor choice (MEDIUM confidence)
- [xml-js npm](https://www.npmjs.com/package/xml-js) — v1.6.11

---

*Stack research for: API Automations (personal automation tool)*
*Researched: 2026-03-19*
