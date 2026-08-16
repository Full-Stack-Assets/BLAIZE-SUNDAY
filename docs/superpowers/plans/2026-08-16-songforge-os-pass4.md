# Songforge OS Build Pass 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an executable Songforge OS monorepo through Build Pass 4 with payload-bound approval actions, deterministic distributor/DSP/YouTube preparation agents, an honest release state machine, revision routing, and a Release Manager UI.

**Architecture:** A deterministic TypeScript control plane owns authorization and release state. Creative generation and media providers are injected capabilities that fail closed. PostgreSQL is canonical, BullMQ is the asynchronous execution surface, and external submission remains unavailable until an approved payload and a verified provider receipt exist.

**Tech Stack:** Node.js 24, TypeScript, pnpm workspaces, Next.js 14, Prisma/PostgreSQL, BullMQ/Redis, Zod, Vitest, Testing Library, AWS S3 client, OpenAI Responses structured outputs.

## Global Constraints

- No input means autonomous creative selection.
- Never publish, upload, spend, transfer rights, or message externally without a payload-bound approval.
- Never mark a release `LIVE` without both a verified platform URL and external confirmation ID.
- A placeholder or prompt-only check must never approve voice or visual identity.
- The repository target is `Full-Stack-Assets/BLAIZE-SUNDAY`; implementation branch is `agent/songforge-os-pass4`.
- Vercel and Render are not deployment targets.

---

### Task 1: Bootstrap the executable monorepo and test harness

**Files:**
- Create: root workspace/package/TypeScript/Vitest/Docker configuration
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/domain.ts`
- Test: `packages/shared/src/domain.test.ts`

**Interfaces:**
- Produces: shared Zod schemas, stable JSON hashing, release/approval enums, and test commands used by all later tasks.

- [ ] Write tests that import the intended shared APIs and fail because the modules do not exist.
- [ ] Run `pnpm test --filter @songforge/shared` and confirm the expected module-resolution failure.
- [ ] Implement the minimal workspace and shared package needed to execute the tests.
- [ ] Run the shared tests and confirm they pass.

### Task 2: Implement payload-bound approval decisions and revision routing

**Files:**
- Create: `packages/release/src/approval.ts`
- Create: `packages/release/src/revision.ts`
- Test: `packages/release/src/approval.test.ts`

**Interfaces:**
- Produces: `createApprovalRequest(payload)`, `resolveApproval(request, decision)`, and `createRevisionInstruction(request, note)`.
- Decisions: `APPROVE`, `REJECT`, `REQUEST_REVISION`.

- [ ] Write failing tests proving payload mismatch, expiry, duplicate resolution, missing rejection reason, and revision instruction creation.
- [ ] Run the focused tests and confirm behavior failures.
- [ ] Implement the smallest pure domain functions that satisfy the tests.
- [ ] Re-run the focused tests and the shared suite.

### Task 3: Implement the distribution honesty state machine

**Files:**
- Create: `packages/release/src/state-machine.ts`
- Test: `packages/release/src/state-machine.test.ts`

**Interfaces:**
- Produces: `transitionRelease(current, target, evidence)` and `RELEASE_TRANSITIONS`.
- Status chain: `PREPARED -> AWAITING_AUTHORIZATION -> SUBMITTED -> ACCEPTED -> SCHEDULED -> LIVE`; any non-live status may move to `FAILED`; `FAILED -> PREPARED`.

- [ ] Write failing tests for valid transitions, invalid skips, unauthorized submission, and the two-evidence `LIVE` gate.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement the minimal transition guard.
- [ ] Re-run the focused tests and shared suite.

### Task 4: Implement distributor, DSP, and YouTube payload builders

**Files:**
- Create: `packages/release/src/payloads.ts`
- Create: `packages/agents/src/real-agents/distribution-agent.ts`
- Create: `packages/agents/src/real-agents/dsp-publishing-agent.ts`
- Create: `packages/agents/src/real-agents/youtube-agent.ts`
- Test: `packages/release/src/payloads.test.ts`

**Interfaces:**
- Produces: `buildDistributionPayload(context)`, `buildDspChecklist(context)`, and `buildYouTubePayload(context)`.
- Each payload returns canonical JSON, SHA-256, missing requirements, and `readyForAuthorization`; no function performs an external submission.

- [ ] Write failing tests for missing approved master/art/rights, complete DSP requirements, YouTube title/description/tag/thumbnail mapping, and deterministic hashes.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement pure builders and thin agent wrappers.
- [ ] Re-run focused and aggregate tests.

### Task 5: Add the canonical Prisma data model and repository services

**Files:**
- Create: `packages/database/prisma/schema.prisma`
- Create: `packages/database/src/client.ts`
- Create: `packages/database/src/seed.ts`
- Create: `packages/release/src/repository.ts`
- Test: `packages/release/src/repository.test.ts`

**Interfaces:**
- Produces: project, asset, release, release-event, approval, revision-request, action-package, agent-run, decision, rights, metadata, and revenue persistence.

- [ ] Write repository contract tests against an in-memory implementation first.
- [ ] Implement the repository port and in-memory test adapter.
- [ ] Add the Prisma schema and production adapter without changing domain behavior.
- [ ] Run Prisma validation/generation and repository tests.

### Task 6: Assemble the Passes 1–3 baseline without false evidence

**Files:**
- Create: canon, LLM, storage, voice, agent registry, creative agent, and orchestration packages.
- Test: focused tests for creative field precedence, autonomous defaults, registry replacement, and honest voice/visual status.

**Interfaces:**
- Produces: `ArtistOperationsOrchestrator`, creative role registry, provider ports, and explicit `UNCONFIGURED`/`UNVERIFIED` outcomes.

- [ ] Write failing tests showing blank input becomes `AI_DECIDES`, real agents replace named stubs, placeholder voices remain unconfigured, and prompt-only checks cannot approve a generated identity.
- [ ] Run tests and confirm expected failures.
- [ ] Implement the minimal baseline and provider adapters.
- [ ] Re-run all package tests.

### Task 7: Implement approval APIs and release command APIs

**Files:**
- Create: approval approve/reject/request-revision routes.
- Create: release list/detail/prepare/status routes.
- Create: API error and serialization helpers.
- Test: route/service tests.

**Interfaces:**
- Produces: three explicit approval actions, release reads, and payload preparation endpoints.

- [ ] Write failing service/route tests for all three decisions, payload mismatch, revision enqueue, and safe error codes.
- [ ] Implement route handlers backed by the release repository/service.
- [ ] Re-run route tests and aggregate tests.

### Task 8: Build the Release Manager UI

**Files:**
- Create: Next.js dashboard, releases list, release detail, approval controls, and status timeline components.
- Test: component tests and production build.

**Interfaces:**
- Consumes: release detail and approval endpoints.
- Produces: truthful state badges, missing-evidence display, approval forms, and append-only timeline.

- [ ] Write failing component tests for the release chain, approval controls, revision form, and absence of a `LIVE` claim without evidence.
- [ ] Implement the smallest responsive UI that passes.
- [ ] Run component tests and `pnpm build`.

### Task 9: Add CI, documentation, and final verification

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`, `.env.example`, and operating-boundary documentation.

**Interfaces:**
- Produces: reproducible local and CI verification commands.

- [ ] Run format check, lint, typecheck, unit tests, Prisma validation/generation, and production build.
- [ ] Run secret scan and inspect `git diff --check` plus `git status --short`.
- [ ] Fix only evidence-backed failures and repeat the full verification matrix.
- [ ] Commit the verified implementation on `agent/songforge-os-pass4` and publish a draft PR when the GitHub transport permits it.

## Execution Choice

The user explicitly selected immediate continuation, so this plan is being executed inline with `superpowers:executing-plans`.
