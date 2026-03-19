# Phase 1: Foundation - Research

**Researched:** 2026-03-19
**Domain:** Fastify backend, AES-256-GCM encryption, SQLite, Docker Compose, Vite+React scaffold
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Both `server/` (Fastify backend) and `client/` (Vite + React) are scaffolded in Phase 1 — even though the frontend is a placeholder at this stage
- Folder split: `server/` for Fastify, `client/` for the Vite frontend
- In production: Fastify serves the built Vite output as static files (single container, one port)
- In development: Vite dev server runs separately; Fastify runs standalone
- TypeScript path aliases set up from day one (`@/routes`, `@/lib`, etc.) — tsconfig paths + build tool configured in Phase 1 so all future phases inherit the pattern
- Error handling — upstream non-2xx responses: Pass through raw — return the upstream HTTP status, headers, and body as-is
- Error handling — request timeout: Hard timeout of 30 seconds; abort the upstream request and return a proxy failure response
- Error handling — proxy failures (DNS error, connection refused, timeout): HTTP 502 with plain-language message + collapsible details section (error code, raw message)
- Error handling — input validation: Validate before attempting the network call; HTTP 400 + plain-language message; same consistent error shape for 400 and 502

### Claude's Discretion

- Exact DB schema: whether Phase 1 defines the full automations table schema or just initializes the encrypted key infrastructure — planner can decide based on what's most useful for Phase 2+
- Proxy request/response envelope structure details (beyond: receives URL/method/headers/body/apiKey, returns upstream status/headers/body)
- TypeScript compilation toolchain specifics (tsup vs tsc, nodemon vs tsx for dev)
- Node version and specific package versions

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-01 | User can input an API endpoint URL | Input validation with Fastify JSON Schema; zod or TypeBox for URL shape check |
| REQ-02 | User can select request method (GET, POST, PUT, PATCH, DELETE) | Enum validation in Fastify schema; /api/execute accepts method field |
| REQ-03 | User can add, edit, and remove request headers as key/value pairs | Headers forwarded as Record<string, string>; passthrough via undici |
| REQ-04 | User can input a request body (shown only for POST/PUT/PATCH) | Body forwarded raw to upstream; conditional in handler based on method |
| REQ-05 | User can paste an API key; backend AI suggests auth placement | Phase 1 scope: accept apiKey field in /api/execute payload; store encrypted; Phase 3 adds AI inference UI |
| REQ-06 | User can execute the request and see the raw response (HTTP status, response headers, body) immediately | /api/execute returns { status, headers, body }; raw passthrough including non-2xx |
</phase_requirements>

---

## Summary

Phase 1 establishes the full project skeleton: Fastify backend with a working `/api/execute` proxy endpoint, AES-256-GCM encryption infrastructure for API keys, SQLite database initialization, Docker Compose for test (port 8094) and prod (port 8095), and a placeholder Vite+React frontend served as static files in production.

The backend proxies any upstream HTTP request using Node's built-in `undici` (via global `fetch` with `AbortSignal.timeout`). The encryption key lives in a volume-backed file (`data/secrets/key`) and a startup check refuses to boot without it. All TypeScript path aliases are configured from day one so Phases 2-4 inherit the pattern without any tooling changes.

The single most important architectural decision is that the `/api/execute` endpoint is a **custom proxy handler** — not a blanket pass-through plugin (`@fastify/http-proxy`). This is necessary because the endpoint needs to extract the `apiKey` from the request body, encrypt it before any persistence, and construct the upstream call with full control over headers and body. `@fastify/reply-from` / `@fastify/http-proxy` are designed for transparent proxying of all routes to a fixed upstream host and are the wrong tool here.

**Primary recommendation:** Use Fastify 5 with TypeBox for schema validation, native `fetch` (undici) with `AbortSignal.timeout(30_000)` for upstream calls, better-sqlite3 for synchronous SQLite, and tsx for development (zero config) + tsup for production builds. Define the full DB schema in Phase 1 so Phase 3 (CRUD) has no migrations to manage.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fastify | 5.x | HTTP server | Fastest Node.js framework; built-in JSON schema validation; excellent TypeScript support |
| @fastify/static | 8.x | Serve Vite build output in prod | Official plugin; SPA fallback support |
| better-sqlite3 | 11.x | SQLite persistence | Synchronous API; fastest SQLite binding; WAL mode; excellent TypeScript types |
| @types/better-sqlite3 | 7.x | TypeScript definitions | Required — types not bundled |
| undici | built-in (Node 18+) | HTTP client for upstream calls | Ships with Node; powers `fetch`; configurable dispatcher |
| tsx | 4.x | Dev-time TypeScript runner + watcher | Zero-config; esbuild-based; replaces ts-node + nodemon |
| tsup | 8.x | Production TypeScript bundler | Fast esbuild-based bundler; handles path aliases; CJS + ESM output |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sinclair/typebox | 0.33.x | JSON Schema + TypeScript types in one | All Fastify route schemas — eliminates schema/type duplication |
| fastify-plugin | 5.x | Proper plugin scoping | Any shared decorator/hook that must escape plugin scope |
| dotenv | 16.x | .env loading for local dev | Only in dev; Docker passes env vars directly in prod |
| @fastify/cors | 9.x | CORS headers | Needed because Vite dev server (port 5173) calls Fastify (different port) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsx (dev) | nodemon + ts-node | tsx is simpler and faster; ts-node has ESM complexity issues |
| tsup (prod) | tsc only | tsc doesn't handle path alias resolution in output; tsup does via esbuild |
| better-sqlite3 | node-sqlite3, Prisma | better-sqlite3 is synchronous (ideal for single-user tool), fastest, simplest |
| native fetch + undici | got, axios, node-fetch | No extra dependency; undici is the Node.js standard HTTP client |
| @sinclair/typebox | zod + zod-to-json-schema | TypeBox generates JSON Schema directly; tighter Fastify integration |

**Installation:**

```bash
# Server
npm install fastify @fastify/static @fastify/cors fastify-plugin better-sqlite3 @sinclair/typebox dotenv
npm install --save-dev tsx tsup typescript @types/node @types/better-sqlite3

# Client
npm create vite@latest client -- --template react-ts
cd client && npm install
```

---

## Architecture Patterns

### Recommended Project Structure

```
automations/
├── server/
│   ├── src/
│   │   ├── routes/          # One file per route group
│   │   │   ├── execute.ts   # POST /api/execute
│   │   │   └── health.ts    # GET /api/health
│   │   ├── lib/
│   │   │   ├── crypto.ts    # AES-256-GCM encrypt/decrypt helpers
│   │   │   ├── db.ts        # better-sqlite3 init + WAL mode + schema
│   │   │   └── proxy.ts     # upstream fetch with timeout + error mapping
│   │   ├── plugins/
│   │   │   └── static.ts    # @fastify/static registration (prod only)
│   │   ├── schemas/
│   │   │   └── execute.ts   # TypeBox schemas for /api/execute
│   │   └── index.ts         # Server entry: build + start
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   └── package.json
├── client/
│   ├── src/
│   │   └── App.tsx          # Placeholder shell
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── data/
│   └── secrets/             # Volume-mounted; key file lives here
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

### Pattern 1: TypeBox Schema + Fastify Route

**What:** Define request/response schema with TypeBox once — get both compile-time TypeScript types and runtime JSON Schema validation for free.

**When to use:** Every Fastify route with a request body or typed query params.

**Example:**

```typescript
// Source: Fastify TypeScript docs + TypeBox docs
import { Type, type Static } from '@sinclair/typebox'
import type { FastifyPluginAsync } from 'fastify'

const ExecuteBody = Type.Object({
  url: Type.String({ format: 'uri' }),
  method: Type.Union([
    Type.Literal('GET'), Type.Literal('POST'),
    Type.Literal('PUT'), Type.Literal('PATCH'), Type.Literal('DELETE'),
  ]),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  body: Type.Optional(Type.String()),
  apiKey: Type.Optional(Type.String()),
})

type ExecuteBodyType = Static<typeof ExecuteBody>

const executeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: ExecuteBodyType }>(
    '/api/execute',
    { schema: { body: ExecuteBody } },
    async (request, reply) => {
      // request.body is fully typed
    }
  )
}
```

### Pattern 2: AES-256-GCM Encrypt / Decrypt

**What:** Use Node's built-in `crypto` module with a 256-bit key, 96-bit IV per operation, and authentication tag.

**When to use:** Any time an API key is persisted to SQLite.

**Example:**

```typescript
// Source: Node.js crypto docs (https://nodejs.org/api/crypto.html)
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96-bit — NIST recommendation for GCM
const TAG_LENGTH = 16  // 128-bit auth tag

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  // Store as iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(stored: string, key: Buffer): string {
  const [ivHex, tagHex, dataHex] = stored.split(':')
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(dataHex, 'hex')).toString('utf8')
         + decipher.final('utf8')
}
```

### Pattern 3: Startup Key Check

**What:** Read the key file at startup; attempt a test encrypt+decrypt; refuse to start if either fails.

**When to use:** Server entry point before `fastify.listen()`.

**Example:**

```typescript
// Key file lives at data/secrets/key (32 bytes binary or 64 hex chars)
import { readFileSync, existsSync } from 'node:fs'
import { encrypt, decrypt } from './lib/crypto.js'

function loadEncryptionKey(): Buffer {
  const keyPath = process.env.KEY_PATH ?? 'data/secrets/key'
  if (!existsSync(keyPath)) {
    console.error(`FATAL: encryption key not found at ${keyPath}`)
    process.exit(1)
  }
  const raw = readFileSync(keyPath)
  const key = raw.length === 64
    ? Buffer.from(raw.toString('utf8').trim(), 'hex')
    : raw  // treat as raw 32-byte binary
  if (key.length !== 32) {
    console.error('FATAL: encryption key must be 32 bytes (256-bit)')
    process.exit(1)
  }
  // Self-test
  const probe = 'startup-check'
  if (decrypt(encrypt(probe, key), key) !== probe) {
    console.error('FATAL: encryption self-test failed')
    process.exit(1)
  }
  return key
}
```

### Pattern 4: Upstream Proxy Call with 30s Timeout

**What:** Use native `fetch` (undici) with `AbortSignal.timeout` to enforce the 30-second hard limit. Map DNS/connection errors to 502.

**When to use:** Inside the `/api/execute` handler.

**Example:**

```typescript
// Source: MDN / Node.js undici docs
export type ProxyResult =
  | { ok: true; status: number; headers: Record<string, string>; body: string }
  | { ok: false; status: 502; message: string; detail: string }

export async function callUpstream(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
): Promise<ProxyResult> {
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
      signal: AbortSignal.timeout(30_000),
    })
    const responseBody = await res.text()
    const responseHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => { responseHeaders[k] = v })
    return { ok: true, status: res.status, headers: responseHeaders, body: responseBody }
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException
    const isTimeout = e.name === 'TimeoutError' || e.code === 'UND_ERR_CONNECT_TIMEOUT'
    return {
      ok: false,
      status: 502,
      message: isTimeout
        ? "Request timed out after 30 seconds — the API didn't respond in time."
        : `Couldn't reach the API — ${friendlyNetError(e)}`,
      detail: `${e.name}: ${e.message}`,
    }
  }
}

function friendlyNetError(e: NodeJS.ErrnoException): string {
  if (e.code === 'ECONNREFUSED') return 'connection refused'
  if (e.code === 'ENOTFOUND') return 'hostname not found'
  if (e.code === 'ECONNRESET') return 'connection reset by server'
  return e.message ?? 'unknown network error'
}
```

### Pattern 5: Docker Compose — Two Services, Same Image

**What:** Single `docker-compose.yml` with two service entries (`app-test`, `app-prod`) pointing to the same image, different ports and env.

**When to use:** Exactly as specified — test port 8094, prod port 8095.

**Example:**

```yaml
# docker-compose.yml
services:
  app-test:
    build: .
    ports:
      - "8094:3000"
    volumes:
      - test-secrets:/app/data/secrets
    environment:
      NODE_ENV: production
      PORT: 3000
      KEY_PATH: /app/data/secrets/key
    profiles: [test]

  app-prod:
    build: .
    ports:
      - "8095:3000"
    volumes:
      - prod-secrets:/app/data/secrets
    environment:
      NODE_ENV: production
      PORT: 3000
      KEY_PATH: /app/data/secrets/key
    profiles: [prod]

volumes:
  test-secrets:
  prod-secrets:
```

### Pattern 6: Fastify Serve SPA Fallback

**What:** Register `@fastify/static` for the built Vite output; add a wildcard `/*` catch-all that returns `index.html` for client-side routing.

**When to use:** Production build inside the container.

**Example:**

```typescript
// Source: @fastify/static docs
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (process.env.NODE_ENV === 'production') {
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '../../client/dist'),
    prefix: '/',
  })
  // SPA fallback — must come AFTER API routes
  fastify.setNotFoundHandler((_req, reply) => {
    reply.sendFile('index.html')
  })
}
```

### Anti-Patterns to Avoid

- **Using `@fastify/http-proxy` or `@fastify/reply-from` for `/api/execute`:** These plugins are for transparent proxying to a fixed upstream host. `/api/execute` needs to extract and encrypt `apiKey` from the body before any persistence, and must proxy to a caller-supplied URL — custom handler is required.
- **Mixing async/callback in Fastify handlers:** Use async exclusively. Never call `reply.send()` AND return a value in the same handler.
- **Global decorators without `fastify-plugin`:** Without wrapping in `fp()`, decorators added in a plugin won't be visible to sibling or parent scopes.
- **Registering `@fastify/static` before API routes:** Static plugin's catch-all will intercept API routes. Register API routes first, then `@fastify/static`.
- **Missing response schema:** Without a response schema, Fastify uses slow `JSON.stringify` and may leak internal fields. Define response shapes with TypeBox.
- **IV reuse in AES-GCM:** Each encryption call MUST generate a fresh `randomBytes(12)` IV. Reusing an IV with the same key destroys GCM's security guarantees.
- **Storing the key as an env var:** The requirement specifies a volume-backed file. Env vars appear in process listings and Docker inspect output. File in a named volume is the correct approach.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | Custom validator | Fastify built-in + TypeBox | Schema compilation, coercion, error messages are non-trivial |
| Static file serving + SPA fallback | Custom static middleware | @fastify/static | Handles etag, cache headers, range requests, MIME types |
| TypeScript path alias resolution in build | Post-process tsconfig paths | tsup (esbuild handles it) | tsc output preserves aliases as bare imports; requires extra tooling to resolve |
| Upstream timeout cancellation | setInterval + manual abort | `AbortSignal.timeout(30_000)` | Built-in; handles cleanup correctly |

**Key insight:** The crypto and DB layers are the most custom code in this phase, but even there Node's built-in `crypto` handles all the hard parts (IV, auth tag, key derivation). Don't add an npm wrapper around it.

---

## Common Pitfalls

### Pitfall 1: tsup Path Alias Not Resolving at Runtime

**What goes wrong:** Build succeeds but the running server throws `Cannot find module '@/lib/crypto'`.
**Why it happens:** tsup resolves aliases during bundling by default, but only when `bundle: true`. If set to `bundle: false` (library mode), aliases remain as-is.
**How to avoid:** Set `bundle: true` in `tsup.config.ts`, or ensure `paths` entries in `tsconfig.json` match the `alias` entries in tsup config.
**Warning signs:** Runtime module-not-found errors after a clean build.

### Pitfall 2: AES-GCM Decryption Fails After Container Restart

**What goes wrong:** Server starts, can encrypt. After restart, all existing ciphertext fails to decrypt.
**Why it happens:** The key file path is wrong, the volume wasn't mounted, or a new key was generated each startup instead of reading the persisted one.
**How to avoid:** Always read the key from the file; never generate a fresh key at startup. The key generation step is a one-time bootstrap script (`npm run keygen` or similar).
**Warning signs:** Auth tag mismatch errors (`ERR_OSSL_EVP_BAD_DECRYPT`).

### Pitfall 3: Fastify API Routes Shadowed by Static Plugin

**What goes wrong:** `GET /api/health` returns a 404 HTML page instead of JSON.
**Why it happens:** `@fastify/static` is registered before API routes and its catch-all intercepts everything.
**How to avoid:** Register all API routes, then register `@fastify/static` last. Or use `prefix: '/assets'` for static to restrict its scope.
**Warning signs:** API routes return HTML 404 instead of JSON.

### Pitfall 4: CORS Errors in Dev (Vite Dev Server → Fastify)

**What goes wrong:** Browser blocks requests from `localhost:5173` to `localhost:3001`.
**Why it happens:** In dev, Vite runs on its own port; Fastify needs CORS headers.
**How to avoid:** Register `@fastify/cors` in dev mode (or always with controlled origin list). In production this is irrelevant because Fastify serves the SPA directly.
**Warning signs:** Browser console shows `CORS policy: No 'Access-Control-Allow-Origin'`.

### Pitfall 5: `undici` / `fetch` AbortSignal Timing Issues

**What goes wrong:** Request appears to time out correctly but error handling receives an unexpected error type.
**Why it happens:** `AbortSignal.timeout` throws a `TimeoutError` (name: `'TimeoutError'`), but some undici versions throw `UND_ERR_CONNECT_TIMEOUT` for connection-level timeouts. The two error shapes differ.
**How to avoid:** Check both `err.name === 'TimeoutError'` AND `err.code === 'UND_ERR_CONNECT_TIMEOUT'` when classifying timeout errors.
**Warning signs:** Timeout errors mapped to generic 502 instead of the specific timeout message.

### Pitfall 6: SQLite DB File Not in Persisted Volume

**What goes wrong:** All automation data is lost on container restart.
**Why it happens:** `data/` directory is inside the container filesystem unless explicitly volume-mounted.
**How to avoid:** Mount `./data` as a named volume in docker-compose.yml. The `data/secrets/key` and `data/automations.db` must both be on the same volume.
**Warning signs:** Empty DB after restart; key-not-found errors.

---

## Code Examples

Verified patterns from official sources:

### better-sqlite3 — DB Init with WAL Mode

```typescript
// Source: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
import Database from 'better-sqlite3'

export function openDb(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}
```

### better-sqlite3 — Schema Init (Run Once)

```typescript
// Defines full schema in Phase 1 so Phase 3 has no migration work
export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS automations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      method      TEXT NOT NULL CHECK(method IN ('GET','POST','PUT','PATCH','DELETE')),
      headers     TEXT NOT NULL DEFAULT '{}',  -- JSON
      body        TEXT,
      api_key_enc TEXT,                        -- AES-256-GCM ciphertext or NULL
      transform_type TEXT CHECK(transform_type IN ('xslt','liquid')),
      template    TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      automation_id  INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      enabled        INTEGER NOT NULL DEFAULT 0,
      schedule_type  TEXT NOT NULL CHECK(schedule_type IN ('interval','weekly','monthly','cron')),
      schedule_value TEXT NOT NULL,  -- JSON: { every: 30, unit: 'minutes' } etc.
      start_at       INTEGER,        -- Unix timestamp or NULL
      created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `)
}
```

### Fastify — Server Entry (index.ts)

```typescript
// Startup order: load key → open DB → register plugins → register routes → listen
import Fastify from 'fastify'
import { loadEncryptionKey } from './lib/crypto.js'
import { openDb, initSchema } from './lib/db.js'

const key = loadEncryptionKey()       // exits process on failure
const db = openDb(process.env.DB_PATH ?? 'data/automations.db')
initSchema(db)

const fastify = Fastify({ logger: true })

// Plugins + routes registered here (async)
await fastify.register(import('./routes/health.js'))
await fastify.register(import('./routes/execute.js'), { db, key })

await fastify.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' })
```

### /api/health Response

```typescript
fastify.get('/api/health', async () => ({ status: 'ok' }))
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-node + nodemon | tsx --watch | 2023-2024 | Zero config; 10x faster startup; no ESM issues |
| tsc for builds | tsup (esbuild) | 2022-2023 | Path alias resolution; 50x faster builds |
| node-fetch / axios | native fetch (undici) | Node 18+ (2022) | No extra dep; AbortSignal.timeout built-in |
| AES-256-CBC | AES-256-GCM | — | GCM provides authenticated encryption; detects tampering |
| Separate static server (nginx) | @fastify/static in single container | — | Simpler Docker setup for single-user personal tool |

**Deprecated/outdated:**

- `ts-node`: ESM config complexity; slow; replaced by tsx in 2024 best practices
- `AES-CBC` without HMAC: No authentication tag; vulnerable to padding oracle and bit-flipping; always use GCM
- `@fastify/http-proxy` for dynamic-URL proxying: Designed for fixed upstreams only; wrong tool for `/api/execute`

---

## Open Questions

1. **Key bootstrap workflow**
   - What we know: The key file must be created once before first run; must be 32 bytes
   - What's unclear: Whether to include a `keygen` npm script that writes the file, or require the user to run `openssl rand -hex 32 > data/secrets/key` manually
   - Recommendation: Include a `npm run keygen` script in `server/package.json` that checks for existing key and generates only if absent — reduces operational error

2. **DB schema scope in Phase 1**
   - What we know: Phase 3 needs automations CRUD; Phase 4 needs scheduled_jobs
   - What's unclear: Whether defining the full schema now (recommended above) causes confusion when Phase 3/4 "add" those tables that already exist
   - Recommendation: Define full schema in Phase 1 using `CREATE TABLE IF NOT EXISTS` — Phase 3/4 plans simply note "schema already exists, skip migration"

3. **Vite proxy config in dev**
   - What we know: Vite dev server runs on a separate port from Fastify in dev
   - What's unclear: Whether to use Vite's `server.proxy` config to avoid CORS entirely in dev, or rely on `@fastify/cors`
   - Recommendation: Both are valid; Vite proxy is cleaner (no CORS header at all); either works

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (server unit tests) |
| Config file | `server/vitest.config.ts` — Wave 0 gap |
| Quick run command | `cd server && npx vitest run --reporter=dot` |
| Full suite command | `cd server && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Reject missing/invalid URL with 400 | unit | `npx vitest run tests/execute.test.ts -t "validates URL"` | Wave 0 |
| REQ-02 | Reject unsupported method with 400 | unit | `npx vitest run tests/execute.test.ts -t "validates method"` | Wave 0 |
| REQ-03 | Headers forwarded to upstream | unit (mock fetch) | `npx vitest run tests/proxy.test.ts -t "forwards headers"` | Wave 0 |
| REQ-04 | Body forwarded for POST/PUT/PATCH | unit (mock fetch) | `npx vitest run tests/proxy.test.ts -t "forwards body"` | Wave 0 |
| REQ-05 | API key encrypted before storage | unit | `npx vitest run tests/crypto.test.ts` | Wave 0 |
| REQ-06 | Returns upstream status/headers/body | unit (mock fetch) | `npx vitest run tests/proxy.test.ts -t "passthrough"` | Wave 0 |
| (health) | /api/health returns 200 | smoke | `curl -f http://localhost:8094/api/health` | manual |
| (crypto) | Encrypt→decrypt round-trip | unit | `npx vitest run tests/crypto.test.ts -t "round-trip"` | Wave 0 |
| (startup) | Server exits if key missing | unit | `npx vitest run tests/startup.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd server && npx vitest run --reporter=dot`
- **Per wave merge:** `cd server && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/vitest.config.ts` — Vitest config with path alias support
- [ ] `server/tests/crypto.test.ts` — encrypt/decrypt round-trip, key load failure
- [ ] `server/tests/proxy.test.ts` — upstream call passthrough, timeout, 502 mapping
- [ ] `server/tests/execute.test.ts` — Fastify route validation (400 cases)
- [ ] `server/tests/startup.test.ts` — missing key → process.exit(1) behaviour
- [ ] Framework install: `cd server && npm install --save-dev vitest @vitest/coverage-v8`

---

## Sources

### Primary (HIGH confidence)

- [Node.js crypto docs](https://nodejs.org/api/crypto.html) — AES-256-GCM createCipheriv/createDecipheriv, randomBytes, auth tag API
- [Fastify TypeScript docs](https://fastify.dev/docs/latest/Reference/TypeScript/) — plugin pattern, RouteGenericInterface, declaration merging
- [better-sqlite3 API docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) — WAL mode pragma, prepared statements, transaction pattern
- [@fastify/static npm](https://www.npmjs.com/package/@fastify/static) — root config, SPA not-found handler

### Secondary (MEDIUM confidence)

- [tsx vs ts-node comparison — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/tsx-vs-ts-node/) — confirms tsx as 2025 standard for dev
- [tsup npm page](https://www.npmjs.com/package/tsup) — build config for backend bundling
- [Node.js timeouts guide — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/nodejs-timeouts/) — AbortSignal.timeout patterns
- [@fastify/http-proxy GitHub](https://github.com/fastify/fastify-http-proxy) — confirmed NOT appropriate for dynamic-URL proxying

### Tertiary (LOW confidence)

- Various DEV.to articles on Fastify + TypeScript project structure — used for structural cross-reference only; official docs are authoritative

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified via npm/GitHub official sources and official Fastify docs
- Architecture: HIGH — patterns derived from official Fastify TypeScript docs and Node.js crypto docs
- Pitfalls: MEDIUM-HIGH — most verified; AbortSignal error shape pitfall is MEDIUM (based on undici issue tracker, not official docs)
- DB schema: MEDIUM — schema content is discretionary; CREATE TABLE IF NOT EXISTS pattern is HIGH confidence

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable stack; tsup/tsx/Fastify 5 are all stable releases)
