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

Create a thin orchestration host under `apps/routenote-runner` and invoke it directly from root package scripts. It uses relative imports into `@songforge/release` and `@songforge/integrations`, so it does not create a second package boundary or require dependency-lock churn.

The runner launches an installed Chrome/Chromium browser with a persistent local profile and controls that browser over the native Chrome DevTools Protocol (CDP), using Node's built-in WebSocket client. A small runner-side CDP implementation satisfies the existing `RouteNoteBrowserPort` contract, so the canonical `executeRouteNoteWorkflow()` remains unchanged.

The existing Playwright-compatible adapter remains available for any external host that already has a Playwright Page. The CLI itself does not require Playwright or download a browser bundle.

## Commands

### `pnpm routenote:login`

1. Resolve the persistent RouteNote browser profile directory.
2. Locate installed Chrome/Chromium or use `ROUTENOTE_BROWSER_EXECUTABLE_PATH`.
3. Launch Chrome headed with a loopback-only ephemeral DevTools port and the persistent profile.
4. Navigate to RouteNote.
5. If an authenticated Distribution surface is already visible, report that the session is reusable.
6. Otherwise leave the browser open for the operator to authenticate normally.
7. Wait until the authenticated Distribution surface is visible.
8. Close Chrome cleanly so profile/session data is flushed to the private local profile directory.

The command never reads, prompts for, stores, or logs a RouteNote password.

### `pnpm routenote:upload <release-id>`

1. Load the canonical release and preparation context with `PrismaReleaseRepository`.
2. If the release is `PREPARED`, call `ReleaseCommandService.prepareDistribution()` for provider `routenote-free`; this creates the canonical action package, payload hash, approval request, and moves the release to `AWAITING_AUTHORIZATION` without submitting anything.
3. If the release is already `AWAITING_AUTHORIZATION`, reuse the newest RouteNote action package only when its payload is a current `BROWSER_AUTOMATION` payload. Reject stale/manual packages.
4. Resolve the approved master and artwork `fileUrl` values into local uploadable files.
5. Verify each local/materialized file SHA-256 against canonical evidence before browser execution.
6. Build a single-track `RouteNoteBrowserJob` from the immutable RouteNote payload plus the verified local asset paths. The current canonical release model is `SINGLE`; multi-track batching remains supported by the lower-level adapter for future release models.
7. Launch the same persistent Chrome profile used by `routenote:login`.
8. Create a CDP-backed `RouteNoteBrowserPort` and run `executeRouteNoteWorkflow()`.
9. Persist the returned `DRAFT_READY` receipt as a `ROUTENOTE_DRAFT_READY` release event with no release-state transition.
10. Write a local JSON copy under `.songforge/routenote/receipts/<release-id>/`.
11. Leave the browser on the finished RouteNote draft for operator inspection. The command exits after the operator closes the browser, unless `ROUTENOTE_CLOSE_BROWSER=1` requests immediate close after the receipt is persisted.

## Asset resolution

The runner supports:

- absolute filesystem paths;
- repository-relative filesystem paths;
- `file://` URLs;
- `http://` and `https://` URLs downloaded into `.songforge/routenote/cache/`.

Remote downloads are written atomically and must match the canonical SHA-256 before use. Unsupported URL schemes fail closed with a stable runner error.

## Browser runtime

The runner has no additional npm browser dependency. It launches installed Chrome/Chromium and uses the native CDP websocket endpoint exposed only on loopback.

Supported overrides:

```text
ROUTENOTE_BROWSER_EXECUTABLE_PATH=/absolute/path/to/browser
ROUTENOTE_HEADLESS=1
ROUTENOTE_PROFILE_DIR=/absolute/path/to/profile
ROUTENOTE_LOGIN_TIMEOUT_MS=900000
ROUTENOTE_CLOSE_BROWSER=1
```

`ROUTENOTE_HEADLESS` defaults to `0` for upload/calibration visibility. Login always forces headed mode.

Browser discovery checks common Google Chrome and Chromium locations for macOS, Windows, and Linux. If no supported browser is found, the runner fails with `ROUTENOTE_BROWSER_NOT_FOUND` and does not mutate RouteNote.

## CDP boundary

The CDP client is intentionally narrow and only implements operations required by `RouteNoteBrowserPort`:

- navigate and current URL;
- semantic locator resolution for the existing centralized RouteNote candidates;
- visibility checks;
- click/fill/select/check;
- file-input assignment using `DOM.setFileInputFiles`;
- text collection and visibility waits;
- screenshots for local evidence.

Action targets must resolve uniquely. Ambiguous action candidates are skipped in favor of a later unique fallback; if no unique fallback exists the runner returns the existing `ROUTENOTE_UI_CONTRACT_CHANGED` error rather than guessing.

## Local private state

Add `.songforge/routenote/` to `.gitignore`. It may contain:

- persistent browser profile/session data;
- downloaded temporary release assets;
- local `DRAFT_READY` receipt copies;
- local failure screenshots.

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

- `ROUTENOTE_CLI_USAGE`
- `ROUTENOTE_RELEASE_NOT_FOUND`
- `ROUTENOTE_CONTEXT_NOT_FOUND`
- `ROUTENOTE_ACTION_PACKAGE_NOT_FOUND`
- `ROUTENOTE_ACTION_PACKAGE_STALE`
- `ROUTENOTE_ASSET_UNRESOLVABLE`
- `ROUTENOTE_ASSET_HASH_MISMATCH`
- `ROUTENOTE_BROWSER_NOT_FOUND`
- `ROUTENOTE_BROWSER_LAUNCH_FAILED`
- `ROUTENOTE_CDP_CONNECTION_FAILED`
- `ROUTENOTE_LOGIN_TIMEOUT`
- existing browser adapter/workflow errors from `@songforge/integrations`

## Testing

Ordinary CI must not launch Chrome or contact RouteNote.

Unit tests use injected repositories/browser-process/CDP/fetch implementations and cover:

- command parsing;
- `PREPARED` release preparation;
- `AWAITING_AUTHORIZATION` package reuse;
- stale manual package rejection;
- local/file/HTTPS asset resolution;
- SHA mismatch rejection;
- job construction from canonical payload;
- persistent-profile browser launch arguments and executable discovery;
- CDP locator/action semantics using a fake protocol transport;
- `DRAFT_READY` event/file receipt persistence;
- no external submission/state transition.

The final repository CI must continue passing frozen install, typecheck, tests, web build, and production-container checks.