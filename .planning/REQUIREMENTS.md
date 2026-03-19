# Requirements: API Automations

**Defined:** 2026-03-19
**Core Value:** Hit any API, describe the transformation in plain English → AI generates XSLT or Liquid → see before/after instantly — saved and schedulable.

## v1 Requirements

### Request Builder

- [x] **REQ-01**: User can input an API endpoint URL
- [x] **REQ-02**: User can select request method (GET, POST, PUT, PATCH, DELETE)
- [x] **REQ-03**: User can add, edit, and remove request headers as key/value pairs
- [x] **REQ-04**: User can input a request body (shown only for POST/PUT/PATCH)
- [x] **REQ-05**: User can paste an API key; backend AI suggests auth placement (Bearer header, named header, or query param) with a one-click confirmation UI
- [x] **REQ-06**: User can execute the request and see the raw response (HTTP status, response headers, body) immediately

### Transformation

- [ ] **REQ-07**: User can select transformation type: XSLT or Liquid
- [ ] **REQ-08**: User can write XSLT/Liquid manually in a syntax-highlighted code editor
- [ ] **REQ-09**: User can describe the desired transformation in natural language; AI generates a valid XSLT or Liquid template
- [ ] **REQ-10**: User can give natural-language instructions to refine an existing template via an AI "Improve" button
- [ ] **REQ-11**: JSON API responses are automatically converted to XML before XSLT processing (silent, no user action required)
- [ ] **REQ-12**: User sees raw response and transformed output side-by-side in the same view

### Automation Management

- [ ] **REQ-13**: User can name and save an automation (stores: endpoint, method, headers, encrypted API key, body, transform type, template)
- [ ] **REQ-14**: User can view a list of all saved automations
- [ ] **REQ-15**: User can open, edit, and re-save an existing automation
- [ ] **REQ-16**: User can delete an automation (with confirmation)
- [ ] **REQ-17**: User can duplicate an automation as a starting point for a new one

### Scheduling

- [ ] **REQ-18**: User can enable or disable a schedule per automation via a toggle
- [ ] **REQ-19**: User can set schedule type: Interval (every N minutes/hours/days), Weekly (day of week + time), Monthly (day of month + time), or Advanced (raw cron expression)
- [ ] **REQ-20**: User can set a start date and time (local time) for the schedule
- [ ] **REQ-21**: Scheduler executes the automation in the background on schedule and saves output to file (no AI calls during scheduled runs — templates execute deterministically)
- [ ] **REQ-22**: Scheduled runs do not overlap (if previous run is still in progress, next run is skipped)

### Output & File Archive

- [ ] **REQ-23**: After each manual or scheduled run, output (raw response + transformed result) is shown in the app
- [ ] **REQ-24**: User can save a run's output to a timestamped file with one click
- [ ] **REQ-25**: Each automation has a dedicated output subfolder on the server (`data/outputs/<automation-slug>/`)
- [ ] **REQ-26**: User can browse the saved output files for any automation from within the app
- [ ] **REQ-27**: User can view and download any saved output file

## v2 Requirements

### Nice-to-haves (deferred)

- **V2-01**: Output file retention policy / auto-cleanup after N days
- **V2-02**: Run history log with status (success/failure/skipped) per automation
- **V2-03**: Execution log viewer (see stdout/errors from past scheduled runs)
- **V2-04**: Import/export automations as JSON for backup
- **V2-05**: Multiple auth configs per automation (e.g., rotate between two keys)
- **V2-06**: SaxonJS 3.x upgrade if it reaches GA stability during or after v1

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth flows | Personal tool — user pastes keys directly; OAuth dance is disproportionate complexity |
| Multi-user / team sharing | Single-user tool; Cloudflare Access gates the whole app |
| Chained automations | Output-as-input chaining is a different product category |
| Webhook triggers | Schedule + manual is sufficient for v1 |
| WebSocket / GraphQL / gRPC | REST only for v1 |
| Mobile-native app | Web app, responsive layout |
| Real-time streaming responses | Buffer complete response then display |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-01 | Phase 1 | Complete |
| REQ-02 | Phase 1 | Complete |
| REQ-03 | Phase 1 | Complete |
| REQ-04 | Phase 1 | Complete |
| REQ-05 | Phase 3 | Complete |
| REQ-06 | Phase 1 | Complete |
| REQ-07 | Phase 2 | Pending |
| REQ-08 | Phase 2 | Pending |
| REQ-09 | Phase 3 | Pending |
| REQ-10 | Phase 3 | Pending |
| REQ-11 | Phase 2 | Pending |
| REQ-12 | Phase 2 | Pending |
| REQ-13 | Phase 3 | Pending |
| REQ-14 | Phase 3 | Pending |
| REQ-15 | Phase 3 | Pending |
| REQ-16 | Phase 3 | Pending |
| REQ-17 | Phase 3 | Pending |
| REQ-18 | Phase 4 | Pending |
| REQ-19 | Phase 4 | Pending |
| REQ-20 | Phase 4 | Pending |
| REQ-21 | Phase 4 | Pending |
| REQ-22 | Phase 4 | Pending |
| REQ-23 | Phase 4 | Pending |
| REQ-24 | Phase 4 | Pending |
| REQ-25 | Phase 4 | Pending |
| REQ-26 | Phase 4 | Pending |
| REQ-27 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation — all 27 requirements mapped*
