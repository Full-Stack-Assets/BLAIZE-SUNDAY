# RouteNote Browser Draft Automation Implementation Plan

> **For agentic workers:** Use the approved design in `docs/superpowers/specs/2026-08-25-routenote-browser-automation-design.md` and execute test-first.

**Goal:** Automate RouteNote release-draft creation/resume, metadata entry, track upload, artwork upload, and store/territory configuration from SongForge's validated payload.

**Architecture:** Keep validation and payload hashing in `@songforge/release`. Add a deterministic RouteNote browser workflow in `@songforge/integrations` behind an injected browser port and centralized locators. The adapter consumes an already-authenticated browser session and stops at a provider-ready draft. It never invokes final distribution.

**Tech Stack:** TypeScript, Node 24 CI, node:test, pnpm workspace, Playwright-compatible injected browser page.

## Constraints

- No undocumented RouteNote APIs.
- No bypass of MFA, CAPTCHA, account verification, or anti-bot controls.
- No RouteNote account authentication secrets stored in source control.
- Ordinary CI performs no RouteNote network calls or provider writes.
- Draft completion does not imply `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE`.
- `@songforge/release` remains authoritative for metadata, rights validation, and payload hashes.
- Track uploads are ordered by canonical `trackIndex` and batched at a maximum of 15 files.
- Final `Distribute Free` action is explicitly out of scope for this implementation.

## Task 1: Browser handoff payload

- Update the existing RouteNote payload test first to require `mode: "BROWSER_AUTOMATION"`, draft capability flags, and `finalSubmission: "HUMAN_AUTHORIZED"` while preserving `submissionPerformed: false`.
- Verify CI fails against the current `MANUAL_IOS_REQUIRED` payload.
- Change only the RouteNote `handoff` object in `packages/release/src/payloads.ts`.
- Verify release payload tests pass.

## Task 2: RouteNote contracts and browser port

Create:
- `packages/integrations/src/routenote/types.ts`
- `packages/integrations/src/routenote/browser-port.ts`
- `packages/integrations/src/routenote/index.ts`
- `packages/integrations/src/routenote/workflow.test.ts`

Contracts include `RouteNoteBrowserJob`, ordered audio track inputs, artwork path/hash, stable error codes, execution receipt, semantic locator candidates, and a minimal browser page interface (`goto`, `isVisible`, `click`, `fill`, `select`, `check`, `setInputFiles`, `text`, `allText`, `waitForVisible`, `screenshot`).

Write the import/error contract tests before implementation and verify they fail before the files exist.

## Task 3: Centralized locators and deterministic workflow

Create:
- `packages/integrations/src/routenote/selectors.ts`
- `packages/integrations/src/routenote/workflow.ts`

Use the current documented RouteNote workflow names as semantic locator candidates: `Distribution`, `Create New Release`, `Release Title`, `Create Release`, `Album Details`, `Add Audio`, `Add Artwork`, `Manage Stores`, `Track Name`, `Choose File`, `Save and Continue`, `Add More Tracks`, `I'm Finished`, and `Select all stores`.

Test first for:
- create/resume draft behavior;
- immutable canonical metadata entry;
- track ordering and 15-file batching;
- provider-side audio confirmation;
- provider-side artwork confirmation;
- requested store selection and explicit exclusions;
- worldwide territory mode leaving include/exclude fields empty;
- duplicate-draft ambiguity failing closed;
- provider validation failures surfacing as stable errors;
- draft mode never invoking final distribution.

Implement `executeRouteNoteWorkflow(job, port)` only after those tests fail as expected.

## Task 4: Playwright-compatible page adapter

Create:
- `packages/integrations/src/routenote/playwright.ts`
- `packages/integrations/src/routenote/playwright.test.ts`

Expose an adapter from an already-created Playwright `Page`-compatible object into `RouteNoteBrowserPort`. Do not launch a browser or manage credentials inside this package. The host runtime owns browser/session setup.

Test first for locator fallback order, UI-contract-change errors, file input mapping, and evidence screenshots on workflow failures.

## Task 5: Integration health

Update `packages/integrations/src/index.test.ts` first, then `packages/integrations/src/index.ts`.

Add RouteNote capabilities:
- `prepare_release`
- `create_release`
- `upload_audio`
- `upload_artwork`
- `configure_metadata`
- `configure_stores`
- `prepare_draft`

Configuration alone must never claim `CONNECTED`; without a verified host browser/session the status remains `UNCONFIGURED` or `UNAUTHORIZED`.

## Task 6: Documentation and verification

Update `docs/distribution/routenote-free-handoff.md` to replace manual-iOS-only language with the browser-draft adapter boundary. Document that the host runtime supplies an authenticated browser page and that final RouteNote distribution remains separate.

Verify PR #23 with its existing CI: frozen install, typecheck, tests, web build, production container build/smoke. Inspect the final patch to confirm source/tests/docs only, no session files, screenshots, binaries, account data, or final-distribution action.