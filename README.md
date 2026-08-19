# Songforge OS

Governed artist operating system for **BLAIZE SUNDAY**. Agents prepare work. Humans authorize irreversible acts. A release cannot be `LIVE` without a verified platform URL and an external confirmation ID.

Vercel and Render are not deployment targets. Use Docker, Fly.io, or Railway.

## Product contract

- Blank creative fields mean `AI_DECIDES`.
- Primary command: **CREATE NEXT RELEASE**.
- Production mode never silently falls back to simulated output.
- No publish, spend, rights transfer, outreach, or buyer contact without a payload-bound approval (I4).

## Monorepo

```text
apps/web          Next.js UI and HTTP API
apps/worker       BullMQ consumers
packages/agents   Role registry, skills, orchestrator, prepare-only adapters
packages/canon    BLAIZE v4 operating subset
packages/database Prisma schema, migrations, seed
packages/integrations  Fail-closed provider health
packages/llm      Structured LLM port
packages/policy   Budgets and I4 gateway
packages/release  Approval and distribution honesty
packages/shared   Hashing, creative fields, project states
packages/storage  Immutable object storage port
packages/voice    Canonical voice registry
```

## Local run

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev          # web on :3000
pnpm worker       # optional, needs REDIS_URL
```

`pnpm docker:up` starts PostgreSQL, Redis, and MinIO. When Redis is unset the API still runs CREATE NEXT RELEASE **inline** and records `queue: INLINE_UNCONFIGURED`.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm --filter @songforge/web build
```

## Acquisition / diligence

This repository is pre-revenue. Do not send a CIM with simulated metrics. Draft data-room materials live in [`docs/dataroom`](docs/dataroom/README.md) and are not a public offering.

Deal perimeter default: Songforge OS + role library as the primary asset; BLAIZE SUNDAY identity/voice/likeness on a separable schedule.
