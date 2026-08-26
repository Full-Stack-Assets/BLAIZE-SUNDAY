# RouteNote Runner CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pnpm routenote:login` and `pnpm routenote:upload <release-id>` so SongForge can bootstrap a reusable RouteNote browser session and prepare a canonical RouteNote draft without manually constructing browser jobs.

**Architecture:** Add a small `apps/routenote-runner` orchestration app. Keep canonical release preparation in `@songforge/release`, browser form execution in `@songforge/integrations`, and host-specific Chrome/profile/filesystem behavior in the runner.

**Tech Stack:** TypeScript, Node 24 CI, pnpm workspace, node:test, Prisma release repository, Playwright Core 1.62.1, installed Google Chrome or an explicit browser executable.

**Spec:** `docs/superpowers/specs/2026-08-26-routenote-runner-cli-design.md`

## Global Constraints

- No RouteNote credentials, cookies, browser profile data, downloaded release media, or local receipts may be committed.
- No CAPTCHA/MFA/anti-bot bypass.
- No `Distribute Free`, agreement acceptance, `recordExternalSubmission`, or transition to `SUBMITTED`.
- Canonical payloads and hashes remain owned by `@songforge/release`.
- `DRAFT_READY` persists only as evidence with no release-state transition.
- Ordinary CI performs no live RouteNote or browser network actions.
- Current canonical release preparation is single-track; lower-level browser batching remains unchanged.

---

### Task 1: Runner package and command parsing

**Files:**
- Create: `apps/routenote-runner/package.json`
- Create: `apps/routenote-runner/tsconfig.json`
- Create: `apps/routenote-runner/src/cli.ts`
- Create: `apps/routenote-runner/src/cli.test.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `parseRouteNoteCli(argv)` returning `{ command: "login" } | { command: "upload"; releaseId: string }`.
- Produces root commands `pnpm routenote:login` and `pnpm routenote:upload <release-id>`.

- [ ] Write failing tests for login parsing, upload release ID parsing, and missing/extra arguments.
- [ ] Run CI and observe the runner package/CLI contract fail before implementation.
- [ ] Add the runner workspace package with dependencies on `@songforge/integrations`, `@songforge/release`, and `playwright-core@1.62.1`; use existing `tsx` and TypeScript dev dependencies.
- [ ] Add the two root pnpm scripts and the corresponding lockfile importer/package entries.
- [ ] Implement minimal CLI parsing and verify tests/typecheck turn green.

### Task 2: Verified asset resolver

**Files:**
- Create: `apps/routenote-runner/src/assets.ts`
- Create: `apps/routenote-runner/src/assets.test.ts`

**Interfaces:**
- Produces: `resolveVerifiedAsset({ fileUrl, sha256, contentType, workspaceRoot, cacheDir, fetchImpl? }): Promise<string>` returning an absolute local path.

- [ ] Write failing tests for absolute paths, repository-relative paths, `file://`, HTTPS download, unsupported scheme, and SHA mismatch.
- [ ] Implement local-path resolution, atomic remote download, content-type extension inference, and SHA-256 verification.
- [ ] Verify all asset tests pass without external network access.

### Task 3: Canonical RouteNote job builder

**Files:**
- Create: `apps/routenote-runner/src/job.ts`
- Create: `apps/routenote-runner/src/job.test.ts`

**Interfaces:**
- Consumes: `ReleaseRepository`, `ReleaseCommandService`, `RouteNoteBrowserJob`.
- Produces: `prepareRouteNoteJob(releaseId, dependencies): Promise<{ job; release; actionPackage; approvalId?: string }>`.

- [ ] Write failing tests for missing release/context, PREPARED preparation, AWAITING_AUTHORIZATION reuse, stale manual package rejection, and deterministic single-track job mapping.
- [ ] For PREPARED releases call `ReleaseCommandService.prepareDistribution` with `provider: "routenote-free"` and actor `routenote-runner`.
- [ ] For AWAITING_AUTHORIZATION releases choose the newest RouteNote action package whose payload has `handoff.mode === "BROWSER_AUTOMATION"`; reject absent/stale packages.
- [ ] Resolve master/artwork through the verified asset resolver and map the immutable payload to one `RouteNoteTrackInput`.
- [ ] Verify tests prove no submission transition occurs.

### Task 4: Persistent Chrome host

**Files:**
- Create: `apps/routenote-runner/src/browser.ts`
- Create: `apps/routenote-runner/src/browser.test.ts`

**Interfaces:**
- Produces: `RouteNoteBrowserHost` with `login()` and `withAuthenticatedPage(fn)`.
- Production implementation uses `playwright-core` `chromium.launchPersistentContext`.

- [ ] Write failing tests for default profile/channel/headless settings, executable-path override, login timeout, and context cleanup.
- [ ] Implement persistent profile under `.songforge/routenote/browser-profile` by default.
- [ ] Login opens RouteNote headed and waits for the authenticated Distribution surface; it never handles credentials.
- [ ] Upload reuses the profile, supports headed/headless mode, and translates missing browser installation into `ROUTENOTE_BROWSER_NOT_FOUND`.
- [ ] Verify browser-host tests use fakes only and launch no real browser in CI.

### Task 5: Receipt persistence and orchestration

**Files:**
- Create: `apps/routenote-runner/src/receipt.ts`
- Create: `apps/routenote-runner/src/receipt.test.ts`
- Modify: `apps/routenote-runner/src/cli.ts`
- Modify: `apps/routenote-runner/src/cli.test.ts`

**Interfaces:**
- Produces: `persistDraftReadyReceipt(repository, receipt, workspaceRoot)`.
- CLI upload composes job builder -> browser host -> `createRouteNotePlaywrightPort` -> `executeRouteNoteWorkflow` -> receipt persistence.

- [ ] Write failing tests proving `ROUTENOTE_DRAFT_READY` is appended with null status transition and a JSON receipt copy is written.
- [ ] Add CLI orchestration tests with fake repository/browser host/workflow.
- [ ] Implement upload orchestration and print the finished draft URL/receipt path.
- [ ] Confirm no code path calls `recordExternalSubmission` or `Distribute Free`.

### Task 6: Private-state guard and operator documentation

**Files:**
- Modify: `.gitignore`
- Modify: `docs/distribution/routenote-free-handoff.md`

- [ ] Add `.songforge/routenote/` to `.gitignore`.
- [ ] Document the two commands, Chrome requirement, environment overrides, session-expiry recovery, and exact stopping boundary.
- [ ] Confirm docs use public `@songforge/integrations` imports and do not instruct users to store credentials.

### Task 7: Final verification

- [ ] Run fresh PR CI on the final commit.
- [ ] Require frozen install, whitespace check, Prisma validation/generation, typecheck, tests, web build, standalone layout, production container build/runtime/smoke, Postgres migration/seed, and agent persistence job to pass.
- [ ] Audit the PR diff for credentials/profile/cache/media artifacts and for any `Distribute Free` or external-submission execution path.
- [ ] Keep PR #23 draft until a real authenticated RouteNote calibration succeeds.