# API Automations

## What This Is

A personal API automation tool for Christian. Users configure HTTP API requests (endpoint, method, auth, headers), execute them, transform the JSON/XML response using XSLT or Liquid templates (with AI assistance to generate or refine transformations from natural language), view raw and transformed output side-by-side, and save named automations — including credentials. Saved automations can be scheduled to run automatically and their outputs browsed from a file archive.

## Core Value

The transformation workflow: hit any API, describe what you want in plain English → AI generates XSLT or Liquid → see before/after instantly — all saved and schedulable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Request Builder**
- [ ] User can input an API endpoint URL
- [ ] User can choose request method (GET, POST, PUT, PATCH, DELETE)
- [ ] User can add custom request headers (key/value pairs)
- [ ] User can input a request body (for POST/PUT/PATCH)
- [ ] User can input an API key; backend AI infers auth placement (Bearer header, custom header, query param) from endpoint pattern + key format + method
- [ ] User can execute the request and see the raw response (status, headers, body)

**Transformation**
- [ ] User can choose transformation type: XSLT or Liquid
- [ ] User can write XSLT/Liquid manually in a code editor
- [ ] User can describe the desired transformation in natural language → AI generates XSLT or Liquid
- [ ] AI "improve" button refines existing template using natural language instruction
- [ ] JSON responses are auto-converted to XML for XSLT processing
- [ ] User sees raw response and transformed result side-by-side

**Automation Management**
- [ ] User can name and save an automation (stores endpoint, method, headers, API key encrypted, body, transform type, template)
- [ ] User can list, open, edit, and delete saved automations
- [ ] User can duplicate an automation

**Scheduling**
- [ ] User can enable a schedule per automation (toggle)
- [ ] User can set schedule type: Interval (every N minutes/hours/days), Weekly (day of week + time), Monthly (day of month + time), Advanced (cron expression)
- [ ] User can set a start date and time (local time)
- [ ] Scheduler runs the automation in the background and saves output to file
- [ ] User can enable/disable schedule without deleting it

**Output & File Archive**
- [ ] Execution output (raw + transformed) is shown in the app after each run
- [ ] User can save output to file (auto-named with timestamp + automation name)
- [ ] Each automation has a subfolder in a project output directory for its saved files
- [ ] User can browse saved output files per automation from within the app
- [ ] User can view/download any saved output file

### Out of Scope

- Multi-user / team sharing — personal tool only
- Webhook triggers (only schedule + manual)
- Chained automations (output of one feeds another)
- OAuth flows (user pastes key; no OAuth dance)

## Context

- This is a standalone personal tool, not embedded in another platform
- Figma reference shows scheduling UX: Schedule type (Interval/Weekly/Monthly/Advanced), start date/time, enable toggle — mirror this pattern
- App slug: `automations` | Prod port: 8095 | Test port: 8094
- Figma token stored at `/home/cf/.openclaw/secrets/figma.env`
- Figma file: `rVfY6Qcrhw4kIKhGiI24gy`, node `4549:174` ("Automations 260319")
- AI transformation uses Claude API (claude-sonnet-4-6) — both for NL→template generation and auth detection
- Output files stored under `data/outputs/<automation-name>/` on the server, persisted via Docker volume

## Constraints

- **Tech stack**: Vite + React + TypeScript + Tailwind + shadcn/ui (frontend) + Node.js + Fastify (backend — needed for: scheduling, file I/O, Claude API calls, secure credential storage)
- **Auth**: Private (Cloudflare Access, Google login `dedooma@gmail.com`)
- **API keys**: Encrypted at rest in backend storage (never exposed in frontend responses)
- **Scheduling**: Backend cron/scheduler (node-cron or similar), not browser-based
- **XSLT processing**: Server-side (Saxon-JS or xslt3 npm package)
- **Liquid**: Server-side (liquidjs npm package)
- **Deployment**: Docker Compose, test port 8094, prod port 8095

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Backend required | Scheduling, file I/O, Claude API, credential encryption all need server | — Pending |
| Claude API for AI features | Auth detection + NL→template generation in one model | — Pending |
| Server-side XSLT/Liquid | Avoids browser sandbox limits; consistent transforms | — Pending |
| JSON→XML auto-convert | Most APIs return JSON; XSLT needs XML — bridge the gap silently | — Pending |

---
*Last updated: 2026-03-19 after initialization*
