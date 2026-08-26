# RouteNote Web Control Panel Design

**Status:** Approved by Human Authority on 2026-08-26 via “Proceed as designed”  
**Parent runner:** `docs/distribution/routenote-runner-cli.md`  
**Stacked base:** `codex/routenote-runner-cli-finalize`

## Goal

Make RouteNote draft preparation usable from the SongForge web interface without requiring terminal commands. The operator should be able to open `/distribution/routenote`, unlock the protected RouteNote controls when required, establish or verify a reusable RouteNote browser session, select a canonical SongForge release, inspect readiness, prepare the RouteNote draft, and open the resulting provider draft.

## Operator experience

After the SongForge owner-control gate is satisfied, the page exposes these RouteNote actions only:

1. **Connect RouteNote** — launches the private RouteNote browser profile and waits for the operator to authenticate normally.
2. **Check connection** — reports whether the current host has a reusable authenticated RouteNote session.
3. **Prepare RouteNote Draft** — executes the already-verified runner path for the selected release.
4. **Open RouteNote Draft** — opens the provider URL returned by a successful `DRAFT_READY` receipt.

The provider-operation UI displays these states:

- `NOT_CONNECTED`
- `LOGIN_REQUIRED`
- `CONNECTED`
- `PREPARING`
- `DRAFT_READY`
- `FAILED`

The outer owner-control surface separately displays locked/checking/configuration states and never treats the SongForge control passphrase as a RouteNote account credential.

## Architecture

The existing `apps/routenote-runner` remains the single host-side implementation of browser/profile/job/receipt behavior. The web app adds a thin server-only bridge in `apps/web/lib/routenote-control.server.ts` and Next route handlers under `apps/web/app/api/distribution/routenote/`. Client components never import browser-process, filesystem, Prisma runner internals, or server-only authority secrets directly.

The web page uses the existing App Router and SongForge visual language. It loads releases and readiness through the server bridge, posts operator actions to the protected RouteNote API surface, and renders progress/result state. The browser automation itself remains on the execution host, not in the mobile browser.

## Host boundary

The web server executing these route handlers must run on a host that can access:

- the SongForge PostgreSQL database;
- approved release media referenced by canonical release evidence;
- an installed Chrome/Chromium binary or `ROUTENOTE_BROWSER_EXECUTABLE_PATH`;
- the private `.songforge/routenote/` profile/cache/receipt directory;
- a server-only `ROUTENOTE_CONTROL_PASSPHRASE` when running in production.

An iPhone or iPad is only the control surface. It does not run Chrome DevTools Protocol automation locally.

A remote/headless host does not automatically make RouteNote’s first interactive sign-in visible on the phone. Initial RouteNote authentication still requires an interactive browser host or an already-authenticated private profile. The web surface does not implement remote-desktop or credential-relay behavior.

## Owner authority gate

The RouteNote web endpoints can launch a browser and create provider drafts, so they must not be exposed as anonymous actions on a public SongForge deployment.

Production therefore fails closed unless `ROUTENOTE_CONTROL_PASSPHRASE` is configured server-side. The operator unlock flow:

1. accepts the **SongForge RouteNote control passphrase**, which is explicitly separate from the RouteNote account password;
2. posts it only to `/api/distribution/routenote/authorize`;
3. performs a timing-safe comparison against the server-only configured secret;
4. returns only a deterministic HMAC authority token in an `HttpOnly`, `SameSite=Strict`, `Secure` production cookie;
5. never stores or returns the plaintext passphrase; and
6. requires that signed cookie before snapshot, login, connection-check, or draft-preparation operations.

The authority cookie defaults to a 12-hour lifetime. Changing the configured server secret invalidates existing cookies.

Local development without a configured control secret may operate without this extra unlock. Any configured secret activates the gate, and production without a configured secret returns a safe configuration error rather than opening the controls.

## API surface

### `POST /api/distribution/routenote/authorize`

Body:

```json
{ "passphrase": "songforge-owner-control-passphrase" }
```

On success, writes the signed HttpOnly authority cookie. This value is not a RouteNote password and is never forwarded to RouteNote.

### `GET /api/distribution/routenote`

Requires owner authority when configured/required and returns the control-panel snapshot:

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

Requires owner authority. Starts the headed RouteNote login bootstrap on the execution host. It waits for the authenticated Distribution surface and returns `CONNECTED`. Authentication, MFA, CAPTCHA, or any provider account challenge remains manual/operator-controlled.

### `POST /api/distribution/routenote/check`

Requires owner authority. Launches the reusable private profile, performs a bounded current-session check against RouteNote’s authenticated Distribution surface, and returns `CONNECTED` or `LOGIN_REQUIRED`. It never attempts RouteNote credentials.

### `POST /api/distribution/routenote/drafts`

Requires owner authority. Body:

```json
{ "releaseId": "songforge-release-id" }
```

Validates the release ID, invokes the existing production runner composition, and returns a **sanitized** `DRAFT_READY` summary with the provider draft URL, completed steps, track confirmation summary, artwork/store status, and payload hash. The local receipt path remains server-private. It never executes final distribution.

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

Primary layout after authority unlock:

- account/session card;
- release selector;
- readiness card;
- primary **Prepare RouteNote Draft** action;
- progress/receipt card;
- **Open RouteNote Draft** link after success.

Buttons use large touch targets suitable for iPhone operation. No terminal instructions appear on the page.

## Error handling

Stable authority/runner/browser errors are mapped to operator actions:

- `ROUTENOTE_CONTROL_LOCKED` → show the owner unlock surface;
- `ROUTENOTE_CONTROL_AUTH_INVALID` → reject the control passphrase safely;
- `ROUTENOTE_CONTROL_AUTH_NOT_CONFIGURED` → production host configuration required;
- `ROUTENOTE_BROWSER_NOT_FOUND` → host unavailable / browser configuration required;
- `ROUTENOTE_SESSION_REQUIRED` or `ROUTENOTE_LOGIN_TIMEOUT` → `LOGIN_REQUIRED`;
- `ROUTENOTE_UI_CONTRACT_CHANGED` → provider UI changed; fail closed;
- `ROUTENOTE_*_CONFIRMATION_MISSING`, metadata/store/provider validation failures → `FAILED` with the stable code;
- release/context/package/readiness failures → selected release is not draft-ready.

Raw stack traces, cookies, profile paths, receipt paths, media URLs, RouteNote credentials, and server-only authority secrets are never returned to the browser.

## Security and authority boundaries

The web surface does not:

- accept or collect RouteNote account passwords;
- forward the SongForge owner-control passphrase to RouteNote;
- bypass CAPTCHA or MFA;
- accept the Artist/Label Agreement;
- click `Distribute Free`;
- call `recordExternalSubmission()`;
- transition a release to `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE`;
- expose local browser-profile/cache/receipt paths to the client.

`DRAFT_READY` remains pre-submission evidence only.

## Testing

Tests cover:

- readiness projection from canonical release context;
- current-session status mapping;
- login/check behavior with fake browser hosts;
- draft preparation composition and fail-closed errors;
- API body validation and sanitized error mapping;
- owner authority passphrase comparison, signed-cookie attributes, secret rotation behavior, and production fail-closed configuration;
- client state reducer/view-model behavior for `NOT_CONNECTED`, `LOGIN_REQUIRED`, `CONNECTED`, `PREPARING`, `DRAFT_READY`, and `FAILED`;
- navigation link presence;
- no executable final-submission path;
- no public local-profile/receipt-path exposure.

Ordinary CI does not launch Chrome, authenticate to RouteNote, or perform provider writes.

## Acceptance criteria

The feature is complete when a mobile operator can navigate to `/distribution/routenote`, satisfy the owner-control gate when required, see current release readiness, initiate RouteNote login/session verification on an appropriate execution host, select a ready release, start draft preparation, receive a `DRAFT_READY` result, and open the returned RouteNote draft without using a terminal.

The stacked PR remains draft until its parent runner PR is available and the end-to-end live RouteNote calibration confirms the current provider UI. Final distribution remains separately authorization-gated.