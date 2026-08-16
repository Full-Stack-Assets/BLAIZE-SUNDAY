# Songforge Lab branch

Creative surface for BLAIZE SUNDAY built in the Songforge session.

## What's on this branch

- **Song Lab** — section editor, auto-save, version history, side-by-side compare
- **Forge variation** — local engine + `/api/forge` (OpenAI-compatible / Groq / OpenRouter)
- **Approvals** — physical gate cards that advance project + release state
- **Pipeline** — agent run log
- **Releases** — state machine rail (PREPARED → … → LIVE)
- **Settings** — local LLM key + nuclear local-state reset
- **Persistence** — localStorage first (`songforge.v1`), swap-ready for `@songforge/database`

## Run locally

```bash
pnpm install
pnpm --filter @songforge/web dev
```

Open http://localhost:3000

## Note

This branch layers the Lab UI on top of the existing BLAIZE-SUNDAY monorepo.
Merge carefully with main's release/backend packages.
