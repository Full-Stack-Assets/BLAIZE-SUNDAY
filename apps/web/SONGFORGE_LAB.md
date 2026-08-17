# Songforge Lab

## Hard constraints

- **No Vercel**
- **No local terminal required for deploy**
- LIVE release still needs human + verified evidence

## Auto-deploy (browser only)

1. Open the repo on GitHub
2. **Settings → Secrets and variables → Actions → New repository secret**
3. Add **one** of:

| Secret | From |
|--------|------|
| `FLY_API_TOKEN` | https://fly.io/user/personal_access_tokens |
| `RAILWAY_TOKEN` | Railway → Account → Tokens |

4. Push to `songforge-lab` (or re-run **Actions → Deploy → Run workflow**)

GitHub Actions builds and deploys. No laptop, no CLI, no Vercel.

Optional secrets: `FLY_APP_NAME`, `RAILWAY_SERVICE`, `OPENAI_API_KEY` (remote forge).

## Workflows

| File | Role |
|------|------|
| `deploy.yml` | Build + auto-deploy Fly/Railway on push |
| `ci.yml` | Typecheck · test · build on PR |
| `db-validate.yml` | Prisma on schema changes |
| `hygiene.yml` | Weekly format + audit |

## Docker / Fly files

- `apps/web/Dockerfile`
- `apps/web/fly.toml`
- `.dockerignore`

PR: https://github.com/Full-Stack-Assets/BLAIZE-SUNDAY/pull/2
