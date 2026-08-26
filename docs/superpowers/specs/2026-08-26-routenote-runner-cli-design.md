# RouteNote Runner CLI Design

**Status:** Approved implementation design  
**Parent implementation:** `docs/superpowers/specs/2026-08-25-routenote-browser-automation-design.md`

## Goal

Add the ergonomic host layer for RouteNote browser draft automation so an operator can run:

```bash
pnpm routenote:login
pnpm routenote:upload <songforge-release-id>
```

without manually constructing `RouteNoteBrowserJob` objects.

## Architecture

Create a small workspace app at `apps/routenote-runner`. It is an orchestration host only. It depends on `@songforge/release` for canonical release state/payload preparation, `@songforge/integrations` for RouteNote browser execution, and `playwright-core` for launching an installed Chrome browser with a persistent local profile.

The existing integration adapter remains browser-launch-neutral and does not gain credential storage, browser binaries, database access, or CLI parsing.

## Commands

### `pnpm routenote:login`

1. Resolve the persistent RouteNote browser profile directory.
2. Launch installed Chrome in headed mode using Playwright Core.
3. Navigate to RouteNote.
4. If an authenticated Distribution surface is already visible, report that the session is reusable.
5. Otherwise leave the browser open for the operator to authenticate normally.
6. Wait until the authenticated Distribution surface is visible.
7. Close the browser context so the persistent profile is flushed to disk.

The command never reads, prompts for, stores, or logs a RouteNote password.

### `pnpm routenote:upload <release-id>`

1. Load the canonical release and preparation context with `PrismaReleaseRepository`.
2. If the release is `PREPARED`, call `ReleaseCommandService.prepareDistribution()` for provider `routenote-free`; this creates the canonical action package, payload hash, approval request, and moves the release to `AWAITING_AUTHORIZATION` without submitting anything.
3. If the release is already `AWAITING_AUTHORIZATION`, reuse the newest RouteNote action package only when its payload is a current `BROWSER_AUTOMATION` payload. Reject stale/manual packages.
4. Resolve the approved master and artwork `fileUrl` values into local uploadable files.
5. Verify each local/materialized file SHA-256 against canonical evidence before browser execution.
6. Build a single-track `RouteNoteBrowserJob` from the immutable RouteNote payload plus the verified local asset paths. The current canonical release model is `SINGLE`; multi-track batching remains supported by the lower-level adapter for future release models.
7. Launch the same persistent Chrome profile used by `routenote:login`.
8. Pass the authenticated page through `createRouteNotePlaywrightPort()` and `executeRouteNoteWorkflow()`.
9. Persist the returned `DRAFT_READY` receipt as a `ROUTENOTE_DRAFT_READY` release event with no release-state transition.
10. Write a local JSON copy under `.songforge/routenote/receipts/<release-id>/`.
11. Leave the browser open on the finished RouteNote draft unless `ROUTENOTE_CLOSE_BROWSER=1`.

## Asset resolution

The runner supports:

- absolute filesystem paths;
- repository-relative filesystem paths;
- `file://` URLs;
- `http://` and `https://` URLs downloaded into `.songforge/routenote/cache/`.

Remote downloads are written atomically and must match the canonical SHA-256 before use. Unsupported URL schemes fail closed with a stable runner error.

## Browser runtime

Use `playwright-core` rather than the full Playwright browser bundle. By default the runner launches the installed Google Chrome channel. A host can override this with:

```text
ROUTENOTE_BROWSER_EXECUTABLE_PATH=/absolute/path/to/browser
ROUTENOTE_BROWSER_CHANNEL=chrome
ROUTENOTE_HEADLESS=1
ROUTENOTE_PROFILE_DIR=/absolute/path/to/profile
ROUTENOTE_LOGIN_TIMEOUT_MS=900000
ROUTENOTE_CLOSE_BROWSER=1
```

`ROUTENOTE_HEADLESS` defaults to `0` for calibration/operator visibility. Login always forces headed mode.

## Local private state

Add `.songforge/routenote/` to `.gitignore`. It may contain:

- persistent browser profile/session data;
- downloaded temporary release assets;
- local `DRAFT_READY` receipt copies.

None of these files are committed.

## Receipt semantics

`DRAFT_READY` remains pre-submission evidence. The runner must not call `recordExternalSubmission`, accept RouteNote agreements, click `Distribute Free`, or move the canonical release to `SUBMITTED`.

The database event uses:

```text
type: ROUTENOTE_DRAFT_READY
fromStatus: null
toStatus: null
actor: routenote-runner
```

with the exact browser receipt and payload hash in evidence.

## Errors

Minimum stable runner errors:

- `ROUTENOTE_RELEASE_NOT_FOUND`
- `ROUTENOTE_CONTEXT_NOT_FOUND`
- `ROUTENOTE_ACTION_PACKAGE_NOT_FOUND`
- `ROUTENOTE_ACTION_PACKAGE_STALE`
- `ROUTENOTE_ASSET_UNRESOLVABLE`
- `ROUTENOTE_ASSET_HASH_MISMATCH`
- `ROUTENOTE_BROWSER_NOT_FOUND`
- `ROUTENOTE_LOGIN_TIMEOUT`
- existing browser adapter errors from `@songforge/integrations`

## Testing

Ordinary CI must not launch Chrome or contact RouteNote.

Unit tests use injected repositories/browser hosts/fetch implementations and cover:

- command parsing;
- `PREPARED` release preparation;
- `AWAITING_AUTHORIZATION` package reuse;
- stale manual package rejection;
- local/file/HTTPS asset resolution;
- SHA mismatch rejection;
- job construction from canonical payload;
- persistent-profile browser options;
- `DRAFT_READY` event/file receipt persistence;
- no external submission/state transition.

The final repository CI must continue passing frozen install, typecheck, tests, web build, and production-container checks.