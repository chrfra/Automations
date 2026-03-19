# Architecture Research

**Domain:** Personal API Automation Tool (proxy + transform + schedule + archive)
**Researched:** 2026-03-19
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER (React/Vite)                       │
├──────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ Request       │  │ Transform       │  │ Automation          │ │
│  │ Builder       │  │ Editor          │  │ List / Scheduler    │ │
│  └───────┬───────┘  └────────┬────────┘  └──────────┬──────────┘ │
│          │                  │                       │            │
│  ┌───────┴──────────────────┴───────────────────────┴──────────┐ │
│  │              API Client (fetch → /api/*)                    │ │
│  └───────────────────────────┬────────────────────────────────┘ │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTP (localhost / same-origin)
┌──────────────────────────────▼───────────────────────────────────┐
│                     BACKEND (Node.js + Fastify)                   │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ /api/execute │  │ /api/        │  │ /api/automations         │ │
│  │ (proxy HTTP) │  │ transform    │  │ CRUD + /schedule         │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘ │
│         │                │                                         │
│  ┌──────▼───────┐  ┌──────▼──────────┐  ┌───────────────────────┐ │
│  │ HTTP Client  │  │ XSLT / Liquid   │  │ Scheduler (node-cron) │ │
│  │ (undici/got) │  │ (Saxon-JS +     │  │ + run-on-startup from │ │
│  │              │  │  liquidjs)      │  │   SQLite              │ │
│  └──────────────┘  └─────────────────┘  └───────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /api/ai  →  Claude API (NL→template, auth detection)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────┤
│                          PERSISTENCE                              │
│  ┌───────────────────────────┐  ┌────────────────────────────┐   │
│  │ SQLite (better-sqlite3)   │  │ File System                │   │
│  │ automations, schedules,   │  │ data/outputs/              │   │
│  │ encrypted API keys        │  │ <automation-name>/         │   │
│  └───────────────────────────┘  │ YYYY-MM-DDTHH-mm-ss.json  │   │
│                                 └────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                               │
             (Docker volume: automations-data)
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Request Builder (FE) | URL, method, headers, body, API key input form | React controlled form + shadcn/ui |
| Transform Editor (FE) | Split-pane code editor (raw / transformed), NL prompt input | CodeMirror or Monaco + split layout |
| Automation List (FE) | CRUD list, open/edit/duplicate/delete | shadcn/ui DataTable or list |
| Scheduler Config (FE) | Toggle, type picker, interval/weekly/monthly/cron inputs | React form with conditional fields |
| File Browser (FE) | Per-automation output file listing + view/download | Simple directory listing from API |
| API Client (FE) | All fetch calls to /api/*, handles auth headers | Typed fetch wrapper or TanStack Query |
| `/api/execute` (BE) | Proxies HTTP requests server-side; keeps API keys off browser | Fastify route + undici/got |
| `/api/transform` (BE) | Runs XSLT (Saxon-JS) or Liquid (liquidjs) server-side | Fastify route + transform services |
| `/api/ai` (BE) | Calls Claude API for NL→template + auth detection | Fastify route + Anthropic SDK |
| `/api/automations` (BE) | CRUD for automations; stores encrypted API keys in SQLite | Fastify plugin + SQLite service |
| `/api/schedule` (BE) | Enable/disable/configure schedule; persists to SQLite | Fastify route + scheduler service |
| `/api/outputs` (BE) | List and serve output files per automation | Fastify static or stream route |
| Scheduler Service (BE) | Loads all enabled schedules on startup; runs node-cron jobs | Singleton service, init at boot |
| Credential Store (BE) | AES-256-GCM encrypt/decrypt API keys; key from env var | Node.js crypto, no external deps |
| SQLite DB (BE) | Source of truth for automations and schedules | better-sqlite3 (synchronous, simple) |
| File Archive (BE) | Writes execution output as JSON files per automation folder | Node.js fs/promises |

## Recommended Project Structure

```
automations/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── request-builder/    # URL/method/headers/body/key form
│   │   │   ├── transform-editor/   # Split pane: raw | transformed + NL input
│   │   │   ├── automation-list/    # CRUD list
│   │   │   ├── scheduler-config/   # Schedule type form
│   │   │   ├── file-browser/       # Output file listing
│   │   │   └── ui/                 # shadcn/ui re-exports
│   │   ├── hooks/                  # useAutomations, useExecute, useTransform
│   │   ├── api/                    # Typed fetch wrappers per resource
│   │   ├── types/                  # Shared TS interfaces (Automation, Schedule, etc.)
│   │   ├── lib/                    # utils, cn()
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── execute.ts          # POST /api/execute
│   │   │   ├── transform.ts        # POST /api/transform
│   │   │   ├── ai.ts               # POST /api/ai/generate, /api/ai/improve, /api/ai/detect-auth
│   │   │   ├── automations.ts      # GET/POST/PUT/DELETE /api/automations
│   │   │   ├── schedules.ts        # PUT /api/automations/:id/schedule
│   │   │   └── outputs.ts          # GET /api/outputs/:automationId
│   │   ├── services/
│   │   │   ├── executor.ts         # HTTP request proxy (undici)
│   │   │   ├── xslt.ts             # Saxon-JS wrapper (JSON→XML + transform)
│   │   │   ├── liquid.ts           # liquidjs wrapper
│   │   │   ├── credentials.ts      # AES-256-GCM encrypt/decrypt
│   │   │   ├── scheduler.ts        # node-cron job registry + startup reload
│   │   │   └── archive.ts          # File write + directory listing
│   │   ├── db/
│   │   │   ├── index.ts            # better-sqlite3 singleton + migrations
│   │   │   └── schema.sql          # DDL: automations, schedules tables
│   │   ├── plugins/
│   │   │   └── db.ts               # Fastify plugin wrapping DB singleton
│   │   └── server.ts               # Fastify app factory + plugin registration
│   ├── tsconfig.json
│   └── package.json
│
├── data/                           # Docker volume mount point
│   ├── automations.db              # SQLite database
│   └── outputs/
│       └── <automation-slug>/      # One folder per automation
│           └── YYYY-MM-DDTHH-mm-ss.json
│
├── docker-compose.yml
├── .env.example
├── context.md
└── design-system/
```

### Structure Rationale

- **routes/ vs services/:** Routes handle HTTP concerns (validation, serialization). Services hold business logic with no Fastify coupling — testable in isolation.
- **services/credentials.ts:** Isolated module so encryption logic is never duplicated; imported only by the automation CRUD service.
- **services/scheduler.ts:** Single registry that owns all active cron jobs. On Fastify startup hook, reads all `enabled: true` schedules from SQLite and registers them. On schedule update, cancels old job and registers new.
- **db/schema.sql:** Keep migrations explicit (not auto-generated) — simple for a personal tool.
- **data/ as volume:** Separates mutable runtime data (DB + files) from immutable image layers.

## Architectural Patterns

### Pattern 1: Server-Side API Proxy

**What:** The frontend sends all external API requests to `POST /api/execute` with the full request spec. The backend makes the actual HTTP call using `undici` and returns the response.

**When to use:** Always — this is the only mode. Browser fetch to external APIs fails CORS. More importantly, API keys must never leave the server.

**Trade-offs:** Adds one network hop (negligible on localhost). Gives you full control: request signing, logging, rate limiting, error normalization.

```typescript
// routes/execute.ts (simplified)
fastify.post('/api/execute', async (request, reply) => {
  const { url, method, headers, body, automationId } = request.body
  // Decrypt API key from DB if automationId provided
  const apiKey = automationId
    ? credentials.decrypt(db.getApiKey(automationId))
    : request.body.apiKey  // transient (never stored in plaintext)
  const result = await executor.run({ url, method, headers, body, apiKey })
  return result
})
```

### Pattern 2: Credential Encryption at Rest

**What:** API keys are encrypted with AES-256-GCM before writing to SQLite. The encryption key comes from `ENCRYPTION_KEY` env var (32-byte hex). The IV and auth tag are stored alongside the ciphertext (base64 concatenated or as separate columns).

**When to use:** Every write of an API key to SQLite. Every read decrypts before use. The plaintext API key is NEVER returned to the frontend — ever.

**Trade-offs:** Simple and dependency-free (Node.js built-in `crypto`). No key rotation built-in (out of scope for personal tool). If `ENCRYPTION_KEY` is lost, stored keys are unrecoverable — document this clearly.

```typescript
// services/credentials.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALG = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // store as: iv(24 hex) + tag(32 hex) + ciphertext(hex)
  return iv.toString('hex') + tag.toString('hex') + encrypted.toString('hex')
}

export function decrypt(stored: string): string {
  const iv = Buffer.from(stored.slice(0, 24), 'hex')
  const tag = Buffer.from(stored.slice(24, 56), 'hex')
  const ciphertext = Buffer.from(stored.slice(56), 'hex')
  const decipher = createDecipheriv(ALG, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
```

### Pattern 3: Scheduler Persistence via SQLite Reload on Startup

**What:** node-cron has no native persistence. The pattern is: SQLite is the source of truth for all schedule configurations. On Fastify startup (after DB plugin is ready), the scheduler service queries `SELECT * FROM schedules WHERE enabled = 1` and registers a node-cron job for each. On any schedule change (enable/disable/reconfigure), the in-memory job registry is updated atomically alongside the SQLite write.

**When to use:** This project. Simpler than Agenda (needs MongoDB) or BullMQ (needs Redis). For a personal tool with at most dozens of automations, SQLite + node-cron is sufficient.

**Trade-offs:** No job queue, no retry logic, no missed-run tracking. If the container was down during a scheduled run, that run is skipped silently. Acceptable for a personal tool; document the limitation.

```typescript
// services/scheduler.ts (simplified)
const jobs = new Map<string, cron.ScheduledTask>()

export async function initScheduler(db: Database) {
  const schedules = db.prepare('SELECT * FROM schedules WHERE enabled = 1').all()
  for (const s of schedules) {
    register(s, db)
  }
}

export function register(schedule: Schedule, db: Database) {
  const existing = jobs.get(schedule.automation_id)
  if (existing) existing.stop()
  const task = cron.schedule(schedule.cron_expr, () => runAutomation(schedule.automation_id, db))
  jobs.set(schedule.automation_id, task)
}

export function unregister(automationId: string) {
  jobs.get(automationId)?.stop()
  jobs.delete(automationId)
}
```

### Pattern 4: Output File Archive Structure

**What:** Each scheduled (or manually saved) execution writes a JSON file under `data/outputs/<automation-slug>/YYYY-MM-DDTHH-mm-ss.json`. The JSON contains both raw response and transformed output.

**When to use:** Every time the user clicks "Save Output" or a scheduler run completes.

**Trade-offs:** Simple filesystem; no DB queries for listing. Works well for a personal tool. At very high frequency schedules (every minute), files accumulate — add a retention/cleanup feature in a later phase if needed.

```
data/outputs/
└── weather-fetch/
    ├── 2026-03-19T06-00-00.json
    ├── 2026-03-19T07-00-00.json
    └── 2026-03-19T08-00-00.json
```

```typescript
// JSON file contents
{
  "automationId": "uuid",
  "automationName": "weather-fetch",
  "executedAt": "2026-03-19T06:00:00.000Z",
  "request": { "url": "...", "method": "GET", "headers": {} },
  "response": {
    "status": 200,
    "headers": {},
    "body": "{ ... raw response ... }"
  },
  "transformed": "... XSLT/Liquid output ...",
  "transformType": "xslt"
}
```

### Pattern 5: XSLT via Saxon-JS with Auto JSON-to-XML Bridge

**What:** Saxon-JS (`saxon-js` npm) runs XSLT 3.0 on Node.js. Because most APIs return JSON, the service auto-converts JSON to XML using XSLT 3.0's `json-to-xml()` — no manual bridging needed. The user writes XSLT against the resulting XML vocabulary.

**When to use:** Whenever transform type is "xslt". Conversion is transparent.

**Trade-offs:** Saxon-JS is a large dependency (~5MB). SEF (stylesheet export file) compilation adds latency on first run. For a personal tool, acceptable. Saxon-JS 3 (beta since 2024) offers improvements — use stable 2.x unless testing new features.

## Data Flow

### Manual Execute + Transform Flow

```
User fills Request Builder
    ↓
POST /api/execute  { url, method, headers, body, apiKey (transient) }
    ↓
backend: executor.ts → undici fetch → external API
    ↓
raw response returned to browser
    ↓
User writes/generates XSLT or Liquid template
    ↓
POST /api/transform  { rawBody, transformType, template }
    ↓
backend: xslt.ts or liquid.ts → transformed string
    ↓
Frontend shows split pane: raw | transformed
    ↓
User clicks "Save Automation"
    ↓
POST /api/automations  { name, ...requestSpec, apiKey (plaintext), template }
    ↓
backend: credentials.encrypt(apiKey) → SQLite write (ciphertext only)
    ↓
Response: automation object (no apiKey field)
```

### AI Assist Flow

```
User types NL description in Transform Editor
    ↓
POST /api/ai/generate  { rawSample, description, transformType }
    ↓
backend: ai.ts → Anthropic SDK → Claude API (server-to-server)
    ↓
Claude returns XSLT or Liquid template string
    ↓
Template injected into Transform Editor
    ↓
User can immediately execute transform to see result
```

### Scheduled Run Flow

```
Fastify starts
    ↓
scheduler.initScheduler(db) — loads enabled schedules → registers node-cron jobs
    ↓
[at cron trigger time]
    ↓
scheduler: reads automation from SQLite, decrypts API key
    ↓
executor.run(automation) → external API
    ↓
xslt.ts or liquid.ts → transform
    ↓
archive.write(automationSlug, { request, response, transformed })
    → data/outputs/<slug>/YYYY-MM-DDTHH-mm-ss.json
```

### Key Data Flows

1. **API key lifecycle:** plaintext (in flight) → encrypted (SQLite write) → decrypted in memory only during execution → never returned to frontend
2. **Transform execution:** always server-side; frontend sends raw body + template, receives transformed string only
3. **Schedule config change:** SQLite write first, then in-memory scheduler registry update — SQLite is source of truth
4. **Output file listing:** `GET /api/outputs/:automationId` → `fs.readdir(data/outputs/<slug>)` → sorted filename list
5. **Output file download:** `GET /api/outputs/:automationId/:filename` → stream file

## SQLite Schema

```sql
-- automations table
CREATE TABLE automations (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,   -- used as folder name in file archive
  url         TEXT NOT NULL,
  method      TEXT NOT NULL DEFAULT 'GET',
  headers     TEXT NOT NULL DEFAULT '{}',   -- JSON string
  body        TEXT,
  api_key_enc TEXT,                          -- AES-256-GCM ciphertext or NULL
  transform_type TEXT,                       -- 'xslt' | 'liquid' | null
  template    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- schedules table (1:1 with automations)
CREATE TABLE schedules (
  automation_id  TEXT PRIMARY KEY REFERENCES automations(id) ON DELETE CASCADE,
  enabled        INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  schedule_type  TEXT NOT NULL,               -- 'interval' | 'weekly' | 'monthly' | 'cron'
  cron_expr      TEXT NOT NULL,               -- canonical cron expression (all types stored as cron)
  start_at       TEXT,                        -- ISO8601 UTC, used only for display/reference
  last_run_at    TEXT,
  next_run_at    TEXT
);
```

**Note on slug:** Generated from `name` at creation (lowercase, hyphens). Used as the filesystem folder name. Slug must not change after creation — the file archive path depends on it.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API (claude-sonnet-4-6) | Anthropic SDK, server-to-server only | API key in `ANTHROPIC_API_KEY` env var; never exposed to frontend; backend route `/api/ai/*` |
| External APIs (user-configured) | undici fetch via `/api/execute` proxy | Headers and auth injected server-side; no CORS issues |
| Saxon-JS (XSLT 3.0) | npm package, in-process call | Large dep; warm-up on first transform; consider caching compiled SEF if performance is a concern |
| liquidjs | npm package, in-process call | Lightweight, pure JS; no warmup needed |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Backend | HTTP REST (`/api/*`), JSON | Same-origin via Docker (frontend served by Fastify or Nginx reverse proxy) |
| Backend routes ↔ Services | Direct function call (TypeScript import) | No internal message bus needed at this scale |
| Scheduler ↔ DB | Direct better-sqlite3 sync call | Scheduler runs in main thread; sync DB is fine |
| Scheduler ↔ Executor | Direct function call | No queue; runs fire-and-forget, logs errors to stdout |
| Backend ↔ File Archive | Node.js `fs/promises` | Data volume mounted at `/app/data` inside container |

## Build Order (Phase Implications)

The component dependency graph suggests this implementation sequence:

1. **DB + credential store** — All other backend features depend on this. Get schema and encrypt/decrypt right first.
2. **Request executor (proxy route)** — Core loop: execute API call. No auth or transforms needed to validate this works.
3. **Transform services (XSLT + Liquid)** — Independent of automations; can be built and tested with static inputs.
4. **Automation CRUD** — Depends on DB + credential store. Connects executor + transforms.
5. **AI route (Claude)** — Depends on nothing else in the backend. Pure: NL string in, template string out.
6. **Scheduler service** — Depends on DB + executor. Build after CRUD is stable so schedule references real automations.
7. **File archive + output browser** — Depends on executor completing a run. Build alongside or after scheduler.
8. **Frontend** — Can start in parallel with backend but needs real API routes to be useful. Build views as corresponding backend routes land.

## Scaling Considerations

This is a personal single-user tool. Scaling is not a concern. Notes for context:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user (target) | Current architecture is appropriate. No queuing needed. |
| Small team (5-10) | Add a job queue (BullMQ) to serialize scheduled runs. Add per-user auth context to automations. |
| Multi-tenant | Full rearchitecture: separate key management, per-tenant DB or schema, proper job queue. |

### First bottleneck (if it ever matters)

XSLT transform on large documents is CPU-bound. Saxon-JS runs synchronously in the main thread. If transforms become slow, move transform execution to a worker thread (`node:worker_threads`) to avoid blocking the Fastify event loop. This is a future concern, not a Phase 1 concern.

## Anti-Patterns

### Anti-Pattern 1: Returning Decrypted API Keys to the Frontend

**What people do:** Include the raw API key in GET `/api/automations/:id` response so the UI can pre-populate the key field for editing.

**Why it's wrong:** Once the key hits the browser, it can be logged, cached, or intercepted. The entire point of server-side encryption is broken.

**Do this instead:** Return a sentinel like `"apiKey": "••••••••"` (masked). For editing, require the user to re-enter the key. On save, only update the encrypted field if a new key was provided (non-masked value).

### Anti-Pattern 2: Running Transforms in the Browser

**What people do:** Use a browser-compatible Liquid or XSLT library to preview transformations client-side.

**Why it's wrong:** Transform behavior can differ between browser and server implementations. Server-side is the authoritative result. Maintaining two execution contexts adds complexity and bugs.

**Do this instead:** Preview calls `POST /api/transform` — same route as production. The round-trip is fast enough (same host). The result is guaranteed identical to what the scheduler will produce.

### Anti-Pattern 3: Storing Schedule as a UI-Friendly String, Not Cron

**What people do:** Store `{ type: 'interval', every: 30, unit: 'minutes' }` and convert to cron at runtime.

**Why it's wrong:** Conversion logic must be duplicated wherever the schedule is evaluated. UI state and scheduler state drift if conversion has bugs.

**Do this instead:** Convert UI schedule config to a canonical cron expression at save time. Store the cron expression. Store the original UI config separately (for display only). Scheduler always uses the cron column.

### Anti-Pattern 4: Using the Filesystem as the Primary Data Store for Automations

**What people do:** Write automation config (name, URL, headers, template) as JSON files rather than using SQLite.

**Why it's wrong:** File-based storage makes queries (list all enabled schedules) fragile. No transactions. Race conditions on concurrent writes (scheduler + user edit).

**Do this instead:** SQLite for all structured data. Filesystem only for binary/large/append-heavy content — i.e., the output archive. This is already the recommended pattern above.

## Sources

- [@fastify/http-proxy — GitHub](https://github.com/fastify/fastify-http-proxy) — MEDIUM confidence (WebSearch verified)
- [SaxonJS npm page](https://www.npmjs.com/package/saxon-js) — HIGH confidence (official)
- [xslt3 npm page](https://www.npmjs.com/package/xslt3) — HIGH confidence (official)
- [Saxon-JS: JSON-to-XML support](https://www.saxonica.com/papers/xmlprague-2016mhk.pdf) — HIGH confidence (Saxonica official)
- [liquidjs — GitHub](https://github.com/harttle/liquidjs) — HIGH confidence (official)
- [node-cron — npm](https://www.npmjs.com/package/node-cron) — HIGH confidence (official)
- [node-cron: no native persistence — GitHub Issue](https://github.com/node-cron/node-cron/issues/340) — HIGH confidence (official maintainer acknowledgement)
- [better-sqlite3-multiple-ciphers — GitHub](https://github.com/m4heshd/better-sqlite3-multiple-ciphers) — MEDIUM confidence (WebSearch)
- [Node.js AES-256-GCM pattern — GitHub Gist](https://gist.github.com/rjz/15baffeab434b8125ca4d783f4116d81) — MEDIUM confidence (WebSearch, standard Node.js crypto)
- [encrypt-at-rest npm — GitHub](https://github.com/zachelrath/encrypt-at-rest) — LOW confidence (WebSearch only, not required — Node.js built-in crypto sufficient)

---
*Architecture research for: Personal API Automation Tool (automations)*
*Researched: 2026-03-19*
