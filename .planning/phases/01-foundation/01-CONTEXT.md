# Phase 1: Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend skeleton that can securely proxy any external API request — credentials encrypted at rest, API keys never written to disk in plaintext. Includes full repo scaffold (backend + frontend structure) and Docker Compose bringing up the stack on both ports. No user-facing UI functionality yet.

</domain>

<decisions>
## Implementation Decisions

### Project Layout
- Both `server/` (Fastify backend) and `client/` (Vite + React) are scaffolded in Phase 1 — even though the frontend is a placeholder at this stage
- Folder split: `server/` for Fastify, `client/` for the Vite frontend
- In production: Fastify serves the built Vite output as static files (single container, one port)
- In development: Vite dev server runs separately; Fastify runs standalone
- TypeScript path aliases set up from day one (`@/routes`, `@/lib`, etc.) — tsconfig paths + build tool configured in Phase 1 so all future phases inherit the pattern

### Error Handling — Upstream Non-2xx Responses
- Pass through raw: return the upstream HTTP status, headers, and body as-is
- Frontend receives the real API response regardless of status code

### Error Handling — Request Timeout
- Hard timeout: 30 seconds
- After 30s, abort the upstream request and return a proxy failure response

### Error Handling — Proxy Failures (DNS error, connection refused, timeout)
- HTTP 502 status
- Response body: plain-language message (e.g. "Couldn't reach the API — connection refused") + collapsible details section with technical info (error code, raw message)
- Same plain-language + expandable details pattern applies to 400 validation errors

### Error Handling — Input Validation
- Validate before attempting the network call
- Reject missing URL, unsupported method, etc. with HTTP 400 + plain-language message
- Consistent error shape across validation (400) and proxy (502) failures

### Claude's Discretion
- Exact DB schema: whether Phase 1 defines the full automations table schema or just initializes the encrypted key infrastructure — planner can decide based on what's most useful for Phase 2+
- Proxy request/response envelope structure details (beyond: receives URL/method/headers/body/apiKey, returns upstream status/headers/body)
- TypeScript compilation toolchain specifics (tsup vs tsc, nodemon vs tsx for dev)
- Node version and specific package versions

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project

### Established Patterns
- None yet — Phase 1 establishes the patterns that all future phases inherit

### Integration Points
- Phase 2 will connect the Vite frontend to the Fastify `/api/execute` endpoint
- Phase 3 will add CRUD routes to the same Fastify server + SQLite DB initialized in Phase 1
- Phase 4 will add a scheduler that runs inside the same Fastify process

</code_context>

<specifics>
## Specific Ideas

- Error display pattern: plain human-readable message shown immediately, technical details (error code, raw upstream message) hidden behind a "Show details" toggle/expandable
- This applies to both proxy failures (502) and validation errors (400)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-19*
