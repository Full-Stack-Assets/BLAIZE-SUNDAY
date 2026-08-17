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
| `preview.yml` | Docker build + optional Fly/Railway (`workflow_dispatch`) |
| `hygiene.yml` | Weekly format + audit |

## Deploy (non-Vercel)

### Docker (any host)

```bash
# from monorepo root
docker build -f apps/web/Dockerfile -t songforge-web .
docker run --rm -p 3000:3000 \
  -e OPENAI_API_KEY=optional \
  songforge-web
```

### Fly.io

```bash
# once
fly launch --config apps/web/fly.toml --no-deploy
# edit app name in fly.toml if needed

fly secrets set OPENAI_API_KEY=...   # optional remote forge
fly deploy --config apps/web/fly.toml --dockerfile apps/web/Dockerfile
```

### Railway

Point the service at `apps/web`, build command `pnpm --filter @songforge/web build`, start `pnpm --filter @songforge/web start`, or use the Dockerfile.

## Local run

```bash
pnpm install
pnpm --filter @songforge/web dev
```

## Files

- `apps/web/Dockerfile` — multi-stage production image
- `apps/web/fly.toml` — Fly scaffold (region `bos`)
- `.dockerignore` — keeps image lean
- `next.config.ts` — `output: "standalone"` for the image

PR: https://github.com/Full-Stack-Assets/BLAIZE-SUNDAY/pull/2
