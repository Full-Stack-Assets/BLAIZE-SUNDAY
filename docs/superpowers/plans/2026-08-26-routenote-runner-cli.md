# RouteNote Runner CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pnpm routenote:login` and `pnpm routenote:upload <release-id>` so SongForge can bootstrap a reusable RouteNote browser session and prepare a canonical RouteNote draft without manually constructing browser jobs.

**Architecture:** Add a thin `apps/routenote-runner` orchestration host invoked directly from root scripts. Keep canonical release preparation in `packages/release`, browser form execution in `packages/integrations`, and host-specific Chrome/profile/CDP/filesystem behavior in the runner. Use installed Chrome/Chromium over the native Chrome DevTools Protocol, with no new npm browser dependency.

**Tech Stack:** TypeScript, Node 24 CI, node:test, Prisma release repository, Node WebSocket, Chrome DevTools Protocol, installed Google Chrome/Chromium or explicit browser executable.

**Spec:** `docs/superpowers/specs/2026-08-26-routenote-runner-cli-design.md`

## Global Constraints

- No RouteNote credentials, cookies, browser profile data, downloaded release media, local screenshots, or receipts may be committed.
- No CAPTCHA/MFA/anti-bot bypass.
- No `Distribute Free`, agreement acceptance, `recordExternalSubmission`, or transition to `SUBMITTED`.
- Canonical payloads and hashes remain owned by `packages/release`.
- `DRAFT_READY` persists only as evidence with no release-state transition.
- Ordinary CI performs no live RouteNote or browser network actions.
- No new npm dependency or lockfile mutation is required for the runner.
- Current canonical release preparation is single-track; lower-level browser batching remains unchanged.

---

### Task 1: Command parsing and root commands

**Files:**
- Create: `apps/routenote-runner/src/cli.ts`
- Create: `apps/routenote-runner/tsconfig.json`
- Modify: `package.json`
- Test initially from: `packages/integrations/src/routenote-runner-cli.test.ts`

**Interfaces:**
- Produces: `parseRouteNoteCli(argv)` returning `{ command: "login" } | { command: "upload"; releaseId: string }`.
- Produces root commands `pnpm routenote:login` and `pnpm routenote:upload <release-id>`.

- [x] Write failing tests for login parsing, upload release ID parsing, and missing/extra arguments.
- [x] Observe RED as missing `apps/routenote-runner/src/cli.ts`.
- [x] Implement minimal CLI parser and observe the focused parser tests turn green.
- [ ] Add root command scripts and include the runner in root test/typecheck verification without creating a workspace package.

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
- Consumes: `ReleaseRepository`, `ReleaseCommandService`, and the existing RouteNote payload/job types through relative package imports.
- Produces: `prepareRouteNoteJob(releaseId, dependencies): Promise<{ job; release; actionPackage; approvalId?: string }>`.

- [ ] Write failing tests for missing release/context, PREPARED preparation, AWAITING_AUTHORIZATION reuse, stale manual package rejection, and deterministic single-track job mapping.
- [ ] For PREPARED releases call `ReleaseCommandService.prepareDistribution` with `provider: "routenote-free"` and actor `routenote-runner`.
- [ ] For AWAITING_AUTHORIZATION releases choose the newest RouteNote action package whose payload has `handoff.mode === "BROWSER_AUTOMATION"`; reject absent/stale packages.
- [ ] Resolve master/artwork through the verified asset resolver and map the immutable payload to one `RouteNoteTrackInput`.
- [ ] Verify tests prove no submission transition occurs.

### Task 4: Native Chrome/CDP browser host

**Files:**
- Create: `apps/routenote-runner/src/cdp.ts`
- Create: `apps/routenote-runner/src/cdp.test.ts`
- Create: `apps/routenote-runner/src/browser.ts`
- Create: `apps/routenote-runner/src/browser.test.ts`

**Interfaces:**
- Produces a narrow CDP client over Node WebSocket.
- Produces a CDP-backed `RouteNoteBrowserPort` implementing the same operations used by `executeRouteNoteWorkflow`.
- Produces `RouteNoteBrowserHost` with `login()` and `withAuthenticatedPort(fn)`.

- [ ] Write failing CDP tests for command/response routing, unique semantic locator resolution, ambiguous-action fallback, fill/select/check/click, file upload via `DOM.setFileInputFiles`, text, navigation, visibility wait, and screenshot mapping.
- [ ] Implement only the CDP methods required by the existing RouteNote browser-port contract.
- [ ] Write failing browser-host tests for executable discovery, persistent profile args, loopback ephemeral debugging port, headed login, headless upload override, timeout, and process cleanup.
- [ ] Implement cross-platform Chrome/Chromium discovery plus persistent profile under `.songforge/routenote/browser-profile` by default.
- [ ] Login opens RouteNote headed and waits for authenticated Distribution UI; it never handles credentials.
- [ ] Verify all browser tests use fakes only and launch no real browser in CI.

### Task 5: Receipt persistence and CLI orchestration

**Files:**
- Create: `apps/routenote-runner/src/receipt.ts`
- Create: `apps/routenote-runner/src/receipt.test.ts`
- Modify: `apps/routenote-runner/src/cli.ts`
- Create: `apps/routenote-runner/src/cli.test.ts`

**Interfaces:**
- Produces: `persistDraftReadyReceipt(repository, receipt, workspaceRoot)`.
- CLI upload composes job builder -> browser host -> `executeRouteNoteWorkflow` -> receipt persistence.

- [ ] Write failing tests proving `ROUTENOTE_DRAFT_READY` is appended with null status transition and a JSON receipt copy is written.
- [ ] Add CLI orchestration tests with fake repository/browser host/workflow.
- [ ] Implement login and upload orchestration and print the finished draft URL/receipt path.
- [ ] Confirm no code path calls `recordExternalSubmission` or `Distribute Free`.

### Task 6: Root integration, private-state guard, operator docs

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `docs/distribution/routenote-free-handoff.md`

- [ ] Add root `routenote:login` and `routenote:upload` scripts using Node's TypeScript strip-types support.
- [ ] Add runner tests/typecheck to the root verification scripts without a new workspace package or lockfile update.
- [ ] Add `.songforge/routenote/` to `.gitignore`.
- [ ] Document the two commands, installed-Chrome requirement, environment overrides, session-expiry recovery, and exact stopping boundary.

### Task 7: Final verification

- [ ] Run fresh PR CI on the final commit.
- [ ] Require frozen install, whitespace check, Prisma validation/generation, typecheck, tests, web build, standalone layout, production container build/runtime/smoke, Postgres migration/seed, and agent persistence job to pass.
- [ ] Audit the PR diff for credentials/profile/cache/media artifacts and for any `Distribute Free` or external-submission execution path.
- [ ] Restore/keep PR #23 in draft state until a real authenticated RouteNote calibration succeeds.