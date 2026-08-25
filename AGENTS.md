# AOC Repository Instructions

These provider-neutral instructions govern Songforge OS and BLAIZE SUNDAY assets in this repository.

## Authority and identity

- Human Authority is final for consequential actions.
- AOC governance comes from `Full-Stack-Assets/Canon`; this repository is authoritative for Songforge implementation, release state, and project evidence.
- Preserve the canonical BLAIZE SUNDAY identity, voice, likeness, rights, credits, and provenance records.

## Release boundary

- Agents may prepare releases; they may not independently publish, distribute, spend, transfer rights, conduct outreach, or contact buyers.
- A release cannot be `LIVE` without a verified platform URL and external confirmation identifier.
- Production mode must never silently fall back to simulation.
- Vercel and Render are not approved deployment targets.
- Do not present simulated streams, sales, audience, or revenue as real.

## Required workflow

1. Run AOC preflight and inspect the canonical voice, rights, release, policy, and approval records.
2. Preserve immutable source assets and checksums; write derivatives as new artifacts.
3. Make the smallest reviewable change.
4. Run `pnpm typecheck`, `pnpm test`, and `pnpm --filter @songforge/web build` when applicable.
5. Record verification evidence, artifact lineage, and provider gaps.

## Human Authority gates

Distribution submission, publication, release-state transition to `LIVE`, spending, rights transfer, contracts, buyer or collaborator contact, voice-model replacement, production deployment, and protected-branch merges require explicit approval.

Never commit provider credentials, signing material, private stems, or unnecessary identity data.
