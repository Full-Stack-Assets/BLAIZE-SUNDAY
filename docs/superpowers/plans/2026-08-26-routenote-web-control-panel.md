# RouteNote Web Control Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first SongForge `/distribution/routenote` surface that replaces terminal usage for RouteNote login/session checks and draft preparation while preserving the existing `DRAFT_READY` boundary.

**Architecture:** Keep browser/process/release orchestration in `apps/routenote-runner`. Add a testable server bridge in `apps/web/lib`, thin Next route handlers, and a client control panel that consumes sanitized snapshots/results. Canonical readiness comes from `@songforge/release`, not duplicated React validation.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma release repository, existing RouteNote runner/CDP host, node:test, Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-26-routenote-web-control-panel-design.md`

## Global Constraints

- No RouteNote credentials, cookies, browser profile data, private media paths, or stack traces returned to the client.
- No CAPTCHA/MFA bypass.
- No agreement acceptance, `Distribute Free`, `recordExternalSubmission()`, or transition beyond `AWAITING_AUTHORIZATION`.
- `DRAFT_READY` is evidence only.
- Ordinary CI must launch no real Chrome/RouteNote session and perform no provider writes.
- Mobile browser is a control surface only; automation runs on the SongForge execution host.
- Client readiness is convenience only; server enforces canonical readiness independently.

---

### Task 1: RouteNote control-domain projection

**Files:**
- Create: `apps/web/lib/routenote-control.ts`
- Create: `apps/web/lib/routenote-control.test.ts`

**Interfaces:**
- Produces `RouteNoteControlStatus`, `RouteNoteReadiness`, `RouteNoteReleaseOption`, `RouteNoteDraftSummary`, `RouteNoteControlSnapshot`.
- Produces `projectRouteNoteReadiness(context)` using `buildRouteNoteChecklist(context)`.
- Produces `mapRouteNoteControlError(error)` that returns sanitized `{ status, code, message }`.

- [ ] Write failing tests for complete readiness, incomplete readiness, browser missing, session required/login timeout, UI contract changed, and generic sanitized failure.
- [ ] Run `node --test apps/web/lib/routenote-control.test.ts` and confirm RED.
- [ ] Implement the projection/error map without filesystem, browser, or Prisma dependencies.
- [ ] Run focused test and `pnpm --filter @songforge/web typecheck`; confirm GREEN.
- [ ] Commit.

### Task 2: Server bridge for snapshot/login/check/draft

**Files:**
- Create: `apps/web/lib/routenote-control.server.ts`
- Create: `apps/web/lib/routenote-control-server.test.ts`

**Interfaces:**
- Produces `RouteNoteControlDependencies` with injected `repository`, `releaseService`, `launchBrowser`, `waitForAuthentication`, `prepareJob`, `executeWorkflow`, `persistReceipt`, `workspaceRoot`, `env`.
- Produces `getRouteNoteControlSnapshot(deps)`.
- Produces `loginRouteNote(deps)`.
- Produces `checkRouteNoteConnection(deps)`.
- Produces `prepareRouteNoteDraft(releaseId, deps)`.
- Produces `createProductionRouteNoteControlDependencies(workspaceRoot, env)`.

- [ ] Write failing fake-only tests proving release readiness projection, current provider check semantics, login closes/flushed session, ready draft orchestration, receipt persistence, and browser cleanup after error.
- [ ] Run focused tests and confirm RED for missing server bridge.
- [ ] Implement snapshot and injected operations by composing `PrismaReleaseRepository`, `ReleaseCommandService`, runner browser/job/receipt functions, and `executeRouteNoteWorkflow`.
- [ ] Ensure `checkRouteNoteConnection` treats profile existence as insufficient and requires current authenticated Distribution visibility.
- [ ] Run focused tests/typecheck; confirm GREEN.
- [ ] Commit.

### Task 3: RouteNote API handlers

**Files:**
- Create: `apps/web/app/api/distribution/routenote/route.ts`
- Create: `apps/web/app/api/distribution/routenote/login/route.ts`
- Create: `apps/web/app/api/distribution/routenote/check/route.ts`
- Create: `apps/web/app/api/distribution/routenote/drafts/route.ts`
- Create: `apps/web/lib/routenote-api.ts`
- Create: `apps/web/lib/routenote-api.test.ts`

**Interfaces:**
- Produces pure `parsePrepareDraftBody(value)` and `toRouteNoteApiError(error)` helpers for testability.
- GET snapshot returns `{ ok: true, snapshot }`.
- POST login/check return `{ ok: true, connection }`.
- POST drafts accepts exactly a non-empty string `releaseId` and returns `{ ok: true, draft }`.

- [ ] Write failing tests for valid/invalid draft body and sanitized HTTP status/error payload mapping.
- [ ] Run focused tests and confirm RED.
- [ ] Implement pure helpers, then thin route handlers that call the production server bridge.
- [ ] Run web tests/typecheck; confirm GREEN.
- [ ] Commit.

### Task 4: Client state/view model

**Files:**
- Create: `apps/web/lib/routenote-control-client.ts`
- Create: `apps/web/lib/routenote-control-client.test.ts`

**Interfaces:**
- Produces `RouteNoteClientState` and reducer `reduceRouteNoteControlState(state, event)`.
- Events cover snapshot load, operation start, connection result, draft success, and failure.
- Produces `canPrepareSelectedRelease(state)`.

- [ ] Write failing tests for all six UI states and button gating.
- [ ] Run focused tests and confirm RED.
- [ ] Implement minimal reducer/view-model functions.
- [ ] Run focused tests/typecheck; confirm GREEN.
- [ ] Commit.

### Task 5: Mobile RouteNote control panel

**Files:**
- Create: `apps/web/app/distribution/routenote/page.tsx`
- Create: `apps/web/components/RouteNoteControlPanel.tsx`
- Modify: `apps/web/components/AppShell.tsx`

**Interfaces:**
- Page renders `RouteNoteControlPanel`.
- Panel calls GET snapshot and POST login/check/drafts APIs.
- Navigation includes `/distribution/routenote` labeled `Distribute`.

- [ ] Implement the page using existing SongForge typography/cards/colors and large touch targets.
- [ ] Account card: status, Connect RouteNote, Check connection.
- [ ] Release selector: canonical ID/title/status only.
- [ ] Readiness card: Audio, Artwork, Metadata, Rights with pass/fail indicators.
- [ ] Primary action: `Prepare RouteNote Draft`, enabled only for canonical ready `PREPARED` or `AWAITING_AUTHORIZATION` release and connected state.
- [ ] Progress card: deterministic pending stages, then authoritative completed steps from receipt.
- [ ] Success: `DRAFT READY` plus `Open RouteNote Draft` external link when provider URL exists.
- [ ] Failure: stable sanitized code/message and appropriate reconnect/retry affordance.
- [ ] Add Distribute navigation entry without removing existing destinations.
- [ ] Run web typecheck/test/build; confirm GREEN.
- [ ] Commit.

### Task 6: Security/diff assertions and operator documentation

**Files:**
- Create: `apps/web/lib/routenote-boundary.test.ts`
- Modify: `docs/distribution/routenote-runner-cli.md`

**Interfaces:**
- Boundary test reads control-panel server/API source and asserts no executable `recordExternalSubmission`, `Distribute Free`, password/cookie serialization, or client profile-path exposure is introduced.

- [ ] Write boundary assertions.
- [ ] Document `/distribution/routenote` as the preferred operator surface; terminal commands remain diagnostic/fallback only.
- [ ] Document host requirement for iPhone/iPad use.
- [ ] Run web tests/typecheck; confirm GREEN.
- [ ] Commit.

### Task 7: Stacked PR and fresh verification

- [ ] Open a draft PR from `codex/routenote-web-control-panel` to `codex/routenote-runner-cli-finalize` so runner dependency is explicit.
- [ ] Run fresh GitHub Actions on final head.
- [ ] Require frozen install, whitespace, Prisma validate/generate, typecheck, full tests, web build, standalone layout, production container build/runtime/smoke, Postgres migration/seed, and persistence tests to pass.
- [ ] Audit diff for credentials, browser profile/cache/media artifacts, raw local paths in client payloads, and any final-distribution execution path.
- [ ] Keep stacked PR draft until parent runner PR and one live RouteNote calibration are satisfied.