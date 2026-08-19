# Video Factory v0.2a — Main Reconciliation Evidence

**Date:** 2026-08-19
**PR:** #7
**Purpose:** Record the conflict-resolution boundary after reconciling `agent/video-factory-wisebase-v0.2a` with current `main`.

## Resolution policy

- Current `main` is the baseline for shared infrastructure, voice work, release behavior, database state, and existing application surfaces.
- Video Factory v0.2a contributes only its intended governed video-generation capability and related tests/UI/data models.
- No PR merge, deployment, provider execution, or publication is authorized by this reconciliation.

## Key resolutions

- Preserved current Node 24 / frozen-pnpm CI and database credentials.
- Added Video Factory Prisma validation, standalone/container, `ffprobe`, and `/video-lab` smoke gates.
- Preserved one Next configuration file and added Video Factory tracing/transpilation requirements there.
- Preserved current API error semantics while adding Video Factory error mappings.
- Added `@songforge/video` as an explicit workspace dependency and regenerated the lockfile rather than disabling frozen-lock enforcement.
- Preserved current BLAIZE voice/Canon state while appending Video Factory Prisma models and regression fixtures.
- Temporary lockfile-repair workflows and staging markers were removed after deterministic lockfile regeneration.

## Verification state

Conflict resolution is complete at the Git history/tree level. Fresh CI after this evidence commit is the authoritative verification gate; do not infer a pass from mergeability alone.
