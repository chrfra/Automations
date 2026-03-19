# Feature Research

**Domain:** Personal API automation tool with response transformation and scheduling
**Researched:** 2026-03-19
**Confidence:** HIGH

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| URL + method input | Every HTTP client has this; without it nothing works | LOW | GET, POST, PUT, PATCH, DELETE minimum |
| Custom request headers (key/value) | Required for most real-world APIs (Content-Type, X-API-Key, etc.) | LOW | Inline editor, not a modal |
| Request body editor | POST/PUT/PATCH payloads are standard practice | LOW | Raw text; JSON syntax hint; disable for GET/DELETE |
| Raw response viewer | Status code, headers, body — the baseline debugging surface | LOW | Show status prominently; pretty-print JSON |
| Auth placement (header/query param) | Every API uses one of ~3 patterns; user should not manually configure this | MEDIUM | Claude API infers from endpoint pattern + key format (already planned) |
| Save and name automations | Without persistence the tool is just a throwaway curl | LOW | Name + all request config stored together |
| List / open / edit / delete saved automations | CRUD on saved automations is assumed | LOW | Simple list view; open an automation to edit it |
| Execute automation and see output | Core loop: configure → run → see result | LOW | Inline result panel; shows after every run |
| Encrypted credential storage | Users will not trust a tool that stores API keys in plain text | MEDIUM | Backend AES or envelope encryption; never expose key in API responses |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by convention, but highly valuable for this use case.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| NL → XSLT/Liquid generation | The core value: describe a transform in English, get working code instantly | HIGH | Claude Sonnet 4-6; prompt must include the actual response XML/JSON as context; produces the template, not just a description |
| AI "improve" on existing template | Iterative refinement without re-writing from scratch; mirrors how people actually edit templates | MEDIUM | Pass current template + instruction + sample response to Claude; replace template in editor |
| JSON → XML auto-conversion for XSLT | XSLT requires XML input; most APIs return JSON — bridging this silently removes the biggest XSLT adoption barrier | MEDIUM | Server-side json2xml (e.g., `xml-js` or `fast-xml-parser`); deterministic mapping rules |
| Side-by-side raw + transformed output | Instant visual feedback on whether the transform did what was intended | LOW | Two panes; both scrollable; no page reload |
| XSLT and Liquid both supported | Different output targets need different template languages (XML → XSLT, HTML/text → Liquid) | MEDIUM | Two separate server-side execution paths; user picks one per automation |
| Backend scheduling with cron | Transforms the tool from manual runner to autonomous pipeline; no browser session required | HIGH | node-cron on Fastify backend; persists schedules across restarts; multiple schedule types |
| Multiple schedule types | Interval, Weekly, Monthly, and raw cron cover real operational patterns without over-engineering | MEDIUM | Interval covers polling; Weekly/Monthly cover report generation; Advanced covers power users |
| Output file archive per automation | Named, timestamped files organized by automation name; makes scheduled output browsable without a database | MEDIUM | `data/outputs/<automation-name>/YYYYMMDD-HHmmss.json` on Docker volume; Fastify serves file list + content |
| Browse + download saved outputs in-app | Closes the loop: schedule runs → output saved → user can inspect history from same UI | MEDIUM | File listing API endpoint; file content fetch endpoint; no external file browser needed |
| Duplicate automation | Starting point for similar requests is faster than rebuilding; standard in every tool that has collections | LOW | Deep copy of config; new name prompt |

### Anti-Features (Deliberately Not Built)

These are features that seem useful but would harm this tool's simplicity and focus.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| OAuth 2.0 dance (PKCE/callback) | Many APIs use OAuth; users will ask for it | Requires redirect URI, browser callback, token refresh loop — 2-4x the auth implementation complexity for a personal tool | User completes OAuth externally and pastes the access token; this tool treats it as a bearer key |
| Webhook / event triggers | "Run when X happens" is a natural extension of scheduling | Requires inbound network port, queue, reliability guarantees — fundamentally different infrastructure than outbound cron calls | Scheduling covers time-based triggering; webhook triggering deferred to v2 if needed |
| Chained automations (pipe output to next) | Power users want pipelines | State management, partial failure handling, branching logic — this becomes n8n. Complexity multiplies with every connection | Single-automation transformations cover the documented use case; outputs land in files that any other tool can read |
| Multi-user / team sharing | "Can I share this automation with a colleague?" | Adds auth model, ownership model, permission model — triples the data layer; this is explicitly a personal tool | Cloudflare Access gates the whole app to one Google account |
| Test assertions / API validation | Postman's killer feature; "assert status 200 and body has field X" | This is a testing tool feature; this tool is an automation/extraction tool. Adding assertions changes what the tool fundamentally is | Out of scope; if testing is needed, use Postman or Bruno |
| GraphQL / gRPC / WebSocket support | Other clients support them | HTTP REST is 95% of the personal API use case; multi-protocol adds separate request editors, schema fetching, streaming — major complexity | REST only for v1; if GraphQL is needed, POST to `/graphql` endpoint with JSON body works as-is |
| Request collection organization (folders/tags) | Postman organizes requests in nested collections | Unnecessary for a personal single-user tool with tens of automations | A flat named list with search/filter is sufficient at personal scale |
| Real-time streaming / SSE display | Some APIs use Server-Sent Events | Requires streaming response handling, chunked display, open connection management — diverges from the request/response model | Out of scope; tool targets standard request/response APIs |
| Environment variables / variable substitution | Postman's environment system for staging/prod URL switching | Adds UI complexity, variable scoping rules, interpolation syntax — justified only when you have multiple environments to manage | Personal tool targets one environment per automation; parameterize at the automation level instead |

---

## Feature Dependencies

```
Request Builder (URL + method + headers + body)
    └──requires──> HTTP Execution Engine
                       └──required by──> Raw Response Viewer
                       └──required by──> Transformation Engine (XSLT / Liquid)
                                             └──requires──> JSON → XML Converter (for XSLT path)
                                             └──enhanced by──> AI Template Generation
                                             └──enhanced by──> AI Template Refinement ("improve")
                       └──required by──> Side-by-Side Output View

Automation Save/Load (CRUD)
    └──requires──> Encrypted Credential Storage
    └──required by──> Scheduling
                          └──requires──> Backend Cron Runner
                          └──produces──> Output File Archive
                                             └──required by──> Browse + Download Outputs UI

AI Template Generation
    └──requires──> Raw Response (to use as context in the prompt)
    └──enhances──> Transformation Engine

Duplicate Automation
    └──requires──> Automation Save/Load
```

### Dependency Notes

- **HTTP Execution Engine requires raw response before transformation can run:** You cannot generate or apply a template without first having a sample response to work with. The UI flow must enforce: execute first, then transform.
- **AI Template Generation requires a response in context:** The Claude prompt must include the actual JSON/XML from the last run, not an abstract schema. This means "run first" must be a prerequisite gating AI generation.
- **Scheduling requires saved automation:** You cannot schedule an anonymous request. The save step must complete before the schedule toggle appears.
- **Output File Archive requires Scheduling:** Manual runs can display output in-app, but file archiving is only meaningful in the scheduled/automated context where no user is watching the screen.
- **JSON → XML Converter is XSLT-path only:** The Liquid path works directly against JSON. The converter must be applied transparently on the server before XSLT execution, invisible to the user.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core workflow.

- [ ] Request Builder — URL, method, headers, body, auth key input — without this nothing is testable
- [ ] HTTP Execution Engine — execute request, return status + headers + body
- [ ] Raw Response Viewer — display status code and body with pretty-printing
- [ ] Transformation Engine (XSLT + Liquid) — manual template entry; server-side execution
- [ ] JSON → XML auto-conversion — silently bridges the gap for XSLT on JSON APIs
- [ ] Side-by-Side Output View — raw and transformed together; the core visual payoff
- [ ] AI Template Generation (NL → template) — the primary differentiator; must be in v1
- [ ] AI "improve" button — low-complexity add-on to generation; rounds out the AI workflow
- [ ] Save / Load / Edit / Delete automations — persistence without this = toy
- [ ] Encrypted credential storage — required before any credential is saved to disk
- [ ] Backend scheduling with interval + weekly + monthly + cron — makes the tool autonomous
- [ ] Output file archive per automation — makes scheduled runs useful (outputs persist)
- [ ] Browse + download saved outputs in-app — closes the scheduled-run loop

### Add After Validation (v1.x)

Features to add once core is proven stable and being used.

- [ ] Duplicate automation — trigger: user manually copy-pasting configs to make variants
- [ ] Run history in-app (last N manual runs, not just scheduled) — trigger: user asks "what did this return last week?"
- [ ] Schedule enable/disable without deleting — trigger: user wants to pause seasonal automations (already in PROJECT.md, likely v1)

### Future Consideration (v2+)

Features to defer until clear demand emerges.

- [ ] Webhook triggers — only if scheduling proves insufficient for the use case
- [ ] Output diff view (compare two runs) — only if archive is used heavily
- [ ] Chained automations — only if single-automation transforms are consistently too limiting

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Request Builder | HIGH | LOW | P1 |
| HTTP Execution | HIGH | LOW | P1 |
| Raw Response Viewer | HIGH | LOW | P1 |
| Transformation Engine (XSLT + Liquid) | HIGH | MEDIUM | P1 |
| JSON → XML auto-convert | HIGH | LOW | P1 |
| Side-by-side output view | HIGH | LOW | P1 |
| AI Template Generation (NL → template) | HIGH | MEDIUM | P1 |
| AI "improve" button | HIGH | LOW | P1 |
| Save / Load / Edit / Delete automations | HIGH | LOW | P1 |
| Encrypted credential storage | HIGH | MEDIUM | P1 |
| Backend scheduling | HIGH | HIGH | P1 |
| Output file archive | HIGH | MEDIUM | P1 |
| Browse + download outputs in-app | MEDIUM | MEDIUM | P1 |
| Duplicate automation | MEDIUM | LOW | P2 |
| Schedule enable/disable toggle | MEDIUM | LOW | P1 |
| Webhook triggers | LOW | HIGH | P3 |
| Chained automations | LOW | HIGH | P3 |
| OAuth 2.0 dance | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Postman | Insomnia | n8n/Zapier | This Tool |
|---------|---------|----------|------------|-----------|
| Request builder | Full; REST + GQL + gRPC | Full; REST + GQL | HTTP node | REST only (deliberate) |
| Auth handling | Manual selection of type | Manual selection of type | Per-node config | AI infers placement from key + endpoint |
| Response transformation | Visualizer (custom JS) | None built-in | Code nodes / expression language | XSLT + Liquid server-side |
| AI template generation | Limited (2025 AI visualizer) | None | Limited (AI nodes) | NL → XSLT/Liquid via Claude (core differentiator) |
| Scheduling | None (use Postman Monitors, paid) | None | Core feature | Core feature, multiple schedule types |
| Output archiving | None | None | Partial (workflow history) | Per-automation timestamped file archive |
| Team features | Paid; collections sharing | Workspace sharing | Paid | None (personal only) |
| Credential encryption | Cloud vault (paid) | Local vault | Secret store | Server-side AES on local Docker volume |
| Self-hosted | No | Yes (Git sync) | Yes (self-hosted) | Yes (Docker Compose) |

---

## Sources

- [Insomnia vs Postman 2026 — Abstracta](https://abstracta.us/blog/testing-tools/insomnia-vs-postman/)
- [Postman Authorization Docs](https://learning.postman.com/docs/sending-requests/authorization/authorization)
- [Postman Authorization Types](https://learning.postman.com/docs/sending-requests/authorization/authorization-types)
- [Postman Response Viewer Docs](https://learning.postman.com/docs/sending-requests/response-data/visualizer)
- [n8n vs Zapier 2026 — Hatchworks](https://hatchworks.com/blog/ai-agents/n8n-vs-zapier/)
- [Bruno vs Postman — Bruno](https://www.usebruno.com/compare/bruno-vs-postman)
- [Top Postman Alternatives 2025 — Testfully](https://testfully.io/blog/top-5-postman-alternatives/)
- [API Scheduling with Cron — DreamFactory Blog](https://blog.dreamfactory.com/how-to-schedule-api-calls)
- [Azure Logic Apps XSLT + Liquid transformation](https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-enterprise-integration-maps)
- [Altova XMLSpy AI Assistant for XSLT generation](https://www.altova.com/xmlspy-xml-editor/ai-assistant)
- [Declarative Programming with XSLT and LLMs — LinkedIn](https://www.linkedin.com/pulse/declarative-programming-xslt-llms-kurt-cagle-hlrbc)
- [Postman September 2025 Product Update](https://blog.postman.com/september-2025-product-updates/)

---
*Feature research for: Personal API automation tool (automations)*
*Researched: 2026-03-19*
