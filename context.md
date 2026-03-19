# context.md — Automations

## What it does

Personal API automation tool. Configure HTTP requests (endpoint, method, headers, auth, body), execute them, transform JSON/XML responses with XSLT or Liquid (AI-assisted generation from natural language), view raw + transformed output side-by-side, save automations, schedule runs.

## Canonical repo

https://github.com/chrfra/Automations

## URLs

- Production: https://automations.christianfransson.com
- Test/Staging: https://automations-test.christianfransson.com

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | Vite + React + TypeScript + Tailwind + shadcn/ui |
| Backend | Node.js + Fastify v5 + TypeScript (tsup build) |
| Storage | SQLite (better-sqlite3) + named Docker volumes |
| Secrets | AES-256-GCM encrypted at rest; key stored in volume-backed file |
| Transforms | Server-side XSLT (Saxon/xslt3) + Liquid (liquidjs) |
| AI | Claude API (claude-sonnet-4-6) — NL→template, auth detection |
| Deployment | Docker Compose (profiles: test=8094, prod=8095) |

## Ports

- Test: 8094 → https://automations-test.christianfransson.com
- Prod: 8095 → https://automations.christianfransson.com

## Key env vars (see .env.example)

- `PORT` — server port (default 3000 inside container)
- `KEY_PATH` — path to AES-256-GCM key file (default data/secrets/key)
- `DB_PATH` — SQLite database path (default data/automations.db)
- `NODE_ENV` — production enables static SPA serving

## Data stores

- SQLite DB: persisted via Docker volume (`test-db`, `prod-db`)
- Secrets: key file in Docker volume (`test-secrets`, `prod-secrets`)
- Output files: `data/outputs/<automation-name>/` (Phase 4)

## Encryption key bootstrap (first run per env)

```bash
docker compose --profile test run --rm app-test sh -c \
  "node -e \"const{randomBytes}=require('crypto');const{writeFileSync,mkdirSync}=require('fs');mkdirSync('/app/data/secrets',{recursive:true});writeFileSync('/app/data/secrets/key',randomBytes(32).toString('hex'))\""
```

## Deploy commands

```bash
# Test
cd /home/cf/.openclaw/apps/automations && git pull && docker compose --profile test up --build -d

# Prod
cd /home/cf/.openclaw/apps/automations && git pull && docker compose --profile prod up --build -d
```

## Access

Private — Cloudflare Access, Google login (dedooma@gmail.com)

## Current phase

Phase 1 (Foundation) — complete as of 2026-03-19
- API proxy endpoint live (/api/execute, /api/health)
- Encryption, DB schema, Docker Compose all working
- Phase 2 next: Transform engine + Builder UI

## Known decisions

- Scheduled runs never call Claude — templates execute deterministically
- Encryption key in volume-backed file with startup health check
- Auth detection UI delivered in Phase 3; backend inference scaffolded in Phase 1
- @fastify/cors v10 required for Fastify v5 (v9 is Fastify v4 only)
- Static plugin path: `../client/dist` relative to `/app/dist`
