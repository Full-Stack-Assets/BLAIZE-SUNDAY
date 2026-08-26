# RouteNote Web Control Panel Design

**Status:** Approved by Human Authority on 2026-08-26 via “Proceed as designed”  
**Parent runner:** `docs/distribution/routenote-runner-cli.md`  
**Stacked base:** `codex/routenote-runner-cli-finalize`

## Goal

Make RouteNote draft preparation usable from the SongForge web interface without requiring terminal commands. The operator should be able to open `/distribution/routenote`, establish or verify a reusable RouteNote browser session, select a canonical SongForge release, inspect readiness, prepare the RouteNote draft, and open the resulting provider draft.

## Operator experience

The page exposes these actions only:

1. **Connect RouteNote** — launches the private RouteNote browser profile and waits for the operator to authenticate normally.
2. **Check connection** — reports whether the current host has a reusable authenticated RouteNote session.
3. **Prepare RouteNote Draft** — executes the already-verified runner path for the selected release.
4. **Open RouteNote Draft** — opens the provider URL returned by a successful `DRAFT_READY` receipt.

The UI displays these operational states:

- `NOT_CONNECTED`
- `LOGIN_REQUIRED`
- `CONNECTED`
- `PREPARING`
- `DRAFT_READY`
- `FAILED`

## Architecture

The existing `apps/routenote-runner` remains the single host-side implementation of browser/profile/job/receipt behavior. The web app adds a thin server-only bridge in `apps/web/lib/routenote-control.server.ts` and Next route handlers under `apps/web/app/api/distribution/routenote/`. Client components never import browser-process, filesystem, or Prisma runner internals directly.

The web page uses the existing App Router and SongForge visual language. It loads releases and readiness through the server bridge, posts operator actions to the new RouteNote API surface, and renders progress/result state. The browser automation itself remains on the execution host, not in the mobile browser.

## Host boundary

The web server executing these route handlers must run on a host that can access:

- the SongForge PostgreSQL database;
- approved release media referenced by canonical release evidence;
- an installed Chrome/Chromium binary or `ROUTENOTE_BROWSER_EXECUTABLE_PATH`;
- the private `.songforge/routenote/` profile/cache/receipt directory.

An iPhone or iPad is only the control surface. It does not run Chrome DevTools Protocol automation locally.

## API surface

### `GET /api/distribution/routenote`

Returns the control-panel snapshot:

```ts
interface RouteNoteControlSnapshot {
  status: "NOT_CONNECTED" | "LOGIN_REQUIRED" | "CONNECTED" | "DRAFT_READY" | "FAILED";
  hostAvailable: boolean;
  releases: RouteNoteReleaseOption[];
  latestDraft?: RouteNoteDraftSummary;
  error?: { code: string; message: string };
}
```

Each release option contains canonical ID/title/status plus a readiness projection. Readiness is computed from `PrismaReleaseRepository.findPreparationContext()` and `buildRouteNoteChecklist()`. It does not duplicate validation rules in React.

### `POST /api/distribution/routenote/login`

Starts the headed RouteNote login bootstrap on the execution host. It waits for the authenticated Distribution surface and returns `CONNECTED`. Authentication, MFA, CAPTCHA, or any provider account challenge remains manual/operator-controlled.

### `POST /api/distribution/routenote/check`

Launches the reusable private profile, performs a bounded current-session check against RouteNote’s authenticated Distribution surface, and returns `CONNECTED` or `LOGIN_REQUIRED`. It never attempts credentials.

### `POST /api/distribution/routenote/drafts`

Body:

```json
{ "releaseId": "songforge-release-id" }
```

Validates the release ID, invokes the existing production runner composition, and returns the exact `DRAFT_READY` summary including receipt path and RouteNote draft URL when available. It never executes final distribution.

## Server bridge

`apps/web/lib/routenote-control.server.ts` exposes injected, testable functions rather than route handlers owning orchestration logic:

```ts
getRouteNoteControlSnapshot(dependencies): Promise<RouteNoteControlSnapshot>
loginRouteNote(dependencies): Promise<RouteNoteConnectionResult>
checkRouteNoteConnection(dependencies): Promise<RouteNoteConnectionResult>
prepareRouteNoteDraft(releaseId, dependencies): Promise<RouteNoteDraftSummary>
```

Production dependencies compose `PrismaReleaseRepository`, `ReleaseCommandService`, and the runner functions from `apps/routenote-runner`. Tests inject repository/browser/workflow fakes and perform no RouteNote network access.

## Connection semantics

A persistent browser-profile directory existing on disk is not proof of authentication. The status is `CONNECTED` only after a current provider check observes the authenticated Distribution surface.

If Chrome cannot be launched, the surface returns `NOT_CONNECTED` with a host-availability error. If Chrome launches but the RouteNote session is expired, the surface returns `LOGIN_REQUIRED`.

The first version does not attempt to keep a long-lived background browser process. Each action launches the private profile for the bounded operation and closes it unless the draft workflow intentionally leaves the finished browser open under existing runner configuration.

## Readiness

For each selectable release, the page displays four operator-friendly groups derived from canonical evidence:

- **Audio** — approved RouteNote-compatible master and technical checks.
- **Artwork** — approved 3000×3000 RGB JPEG within RouteNote size limits.
- **Metadata** — required RouteNote release metadata, writers, dates, and AI provenance fields.
- **Rights** — rights approval, ownership confirmation, provenance completion, and no unresolved rights warnings.

The **Prepare RouteNote Draft** button is enabled only when the release status is `PREPARED` or `AWAITING_AUTHORIZATION` and the canonical RouteNote checklist is ready. The server independently enforces the same requirement; client disablement is convenience, not authorization.

## Progress presentation

During a prepare request the client shows `PREPARING` and the deterministic expected stages:

1. Verify release
2. Verify assets
3. Open RouteNote
4. Create/resume draft
5. Metadata
6. Audio
7. Artwork
8. Stores
9. Provider validation
10. `DRAFT_READY`

The first implementation does not add streaming/WebSocket progress. It shows an in-flight progression shell while the request is pending, then replaces it with the authoritative completed steps from the returned receipt. This avoids creating a second job/queue subsystem solely for UI animation.

## Navigation and mobile design

Add a **Distribute** entry to SongForge navigation linking to `/distribution/routenote`. The page is mobile-first and fits the existing dark SongForge visual system.

Primary layout:

- account/session card;
- release selector;
- readiness card;
- primary **Prepare RouteNote Draft** action;
- progress/receipt card;
- **Open RouteNote Draft** link after success.

Buttons use large touch targets suitable for iPhone operation. No terminal instructions appear on the page.

## Error handling

Stable runner/browser errors are mapped to operator actions:

- `ROUTENOTE_BROWSER_NOT_FOUND` → host unavailable / browser configuration required;
- `ROUTENOTE_SESSION_REQUIRED` or `ROUTENOTE_LOGIN_TIMEOUT` → `LOGIN_REQUIRED`;
- `ROUTENOTE_UI_CONTRACT_CHANGED` → provider UI changed; fail closed;
- `ROUTENOTE_*_CONFIRMATION_MISSING`, metadata/store/provider validation failures → `FAILED` with the stable code;
- release/context/package/readiness failures → selected release is not draft-ready.

Raw stack traces, cookies, profile paths, media URLs, and credentials are never returned to the browser.

## Security and authority boundaries

The web surface does not:

- accept or collect RouteNote passwords;
- bypass CAPTCHA or MFA;
- accept the Artist/Label Agreement;
- click `Distribute Free`;
- call `recordExternalSubmission()`;
- transition a release to `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE`;
- expose local browser-profile/cache paths to the client except the existing non-sensitive receipt identifier/summary needed by the operator.

`DRAFT_READY` remains pre-submission evidence only.

## Testing

Tests cover:

- readiness projection from canonical release context;
- current-session status mapping;
- login/check behavior with fake browser hosts;
- draft preparation composition and fail-closed errors;
- API body validation and sanitized error mapping;
- client state reducer/view-model behavior for `NOT_CONNECTED`, `LOGIN_REQUIRED`, `CONNECTED`, `PREPARING`, `DRAFT_READY`, and `FAILED`;
- navigation link presence;
- no executable final-submission path.

Ordinary CI does not launch Chrome, authenticate to RouteNote, or perform provider writes.

## Acceptance criteria

The feature is complete when a mobile operator can navigate to `/distribution/routenote`, see current release readiness, initiate RouteNote login/session verification, select a ready release, start draft preparation, receive a `DRAFT_READY` result, and open the returned RouteNote draft without using a terminal.

The stacked PR remains draft until its parent runner PR is available and the end-to-end live RouteNote calibration confirms the current provider UI. Final distribution remains separately authorization-gated.