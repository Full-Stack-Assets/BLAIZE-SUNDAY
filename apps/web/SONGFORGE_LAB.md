# Songforge Lab branch

Creative surface for BLAIZE SUNDAY.

## On this branch

### GitHub Actions
- `.github/workflows/ci.yml` — typecheck, test, web build on PR/push
- `.github/workflows/db-validate.yml` — Prisma validate on schema changes
- `.github/workflows/preview.yml` — Vercel preview scaffold (enable after secrets)
- `.github/workflows/hygiene.yml` — weekly format + audit

### Lab UI (session build)
- AppShell, ProjectCard, layout, globals, tailwind
- Lab home (`app/page.tsx`) — new track + project strip
- Pipeline — agent run log
- Releases — state machine rail
- Approvals page
- Types + forge variation engine + `/api/forge` route

### Still local / in zip (drop in to complete)
- `components/SongLab.tsx` — writing surface
- `lib/persistence.ts` — localStorage layer
- `app/settings/page.tsx` — LLM key + reset
- `components/ApprovalCard.tsx` — gate cards

Complete source: session `songforge-lab.zip`

## Run

```bash
pnpm install
pnpm --filter @songforge/web dev
```

Open http://localhost:3000

## PR

https://github.com/Full-Stack-Assets/BLAIZE-SUNDAY/pull/2
