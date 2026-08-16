# Songforge Lab branch

Creative surface for BLAIZE SUNDAY.

## Hard constraints

- **Do not use Vercel.** Deploy with Docker, Fly.io, Railway, Render, or self-hosted.
- Never mark a release `LIVE` without verified external evidence.
- Agents prepare; humans authorize irreversible actions.

## GitHub Actions

| Workflow | Role |
|----------|------|
| `ci.yml` | Typecheck · test · web build on PR/push |
| `db-validate.yml` | Prisma validate on schema changes |
| `preview.yml` | Docker build + optional Fly/Railway deploy (`workflow_dispatch` only) |
| `hygiene.yml` | Weekly format + audit |

## Lab UI (session build)

- AppShell, ProjectCard, layout, globals, tailwind
- Lab home — new track + project strip
- Pipeline — agent run log
- Releases — state machine rail
- Approvals page
- Types + forge engine + `/api/forge`

### Still local / in zip

- `components/SongLab.tsx`
- `lib/persistence.ts`
- `app/settings/page.tsx`
- `components/ApprovalCard.tsx`

## Local run

```bash
pnpm install
pnpm --filter @songforge/web dev
```

## Deploy (non-Vercel)

```bash
# Docker (self-host / any registry)
docker build -f apps/web/Dockerfile -t songforge-web .
docker run -p 3000:3000 songforge-web

# Fly.io
fly launch --config apps/web/fly.toml   # once
fly deploy -c apps/web/fly.toml

# Railway
railway up --service web
```

PR: https://github.com/Full-Stack-Assets/BLAIZE-SUNDAY/pull/2
