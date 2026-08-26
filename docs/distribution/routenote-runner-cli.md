# RouteNote Runner CLI

The RouteNote runner is the operator-facing ignition layer for SongForge's RouteNote draft automation.

It turns the lower-level browser adapter into two commands:

```bash
pnpm routenote:login
pnpm routenote:upload <songforge-release-id>
```

The runner prepares RouteNote drafts only. It never accepts RouteNote agreements, clicks `Distribute Free`, records an external submission, or advances a SongForge release to `SUBMITTED`.

## Prerequisites

- Node 20+; repository CI currently verifies Node 24.
- pnpm 9+.
- A working SongForge database connection for `routenote:upload`.
- Google Chrome or Chromium installed locally.
- A SongForge release with a valid RouteNote preparation context, approved master, approved artwork, metadata, rights/provenance evidence, and asset SHA-256 values.

The runner does not require Playwright or a downloaded browser bundle. It launches installed Chrome/Chromium and controls the session through Chrome DevTools Protocol on loopback only.

## 1. Establish the reusable RouteNote session

Run:

```bash
pnpm routenote:login
```

The runner will:

1. create or reuse the private profile at `.songforge/routenote/browser-profile/`;
2. discover installed Chrome/Chromium, or use an explicit executable override;
3. launch RouteNote in a headed browser;
4. wait for the authenticated RouteNote Distribution surface;
5. leave credential entry, MFA, CAPTCHA, and other interactive verification entirely to the operator; and
6. close Chrome after authentication is detected so the reusable profile is flushed to disk.

No RouteNote password is read, prompted for, stored, or logged by SongForge.

Default login timeout is 15 minutes.

## 2. Prepare a RouteNote draft

Run:

```bash
pnpm routenote:upload <songforge-release-id>
```

Example:

```bash
pnpm routenote:upload release-123
```

The runner will automatically:

1. load the canonical release and preparation context;
2. if the release is `PREPARED`, build the current `routenote-free` action package and approval request through `ReleaseCommandService`;
3. if the release is already `AWAITING_AUTHORIZATION`, reuse the newest current `BROWSER_AUTOMATION` RouteNote package and reject stale/manual packages;
4. resolve the canonical master and artwork from local paths, `file://`, or HTTP(S) sources;
5. verify every materialized asset against its canonical SHA-256 before upload;
6. build the `RouteNoteBrowserJob` automatically;
7. launch the same persistent RouteNote Chrome profile;
8. create or resume the matching RouteNote release draft;
9. enter canonical metadata;
10. upload audio and artwork;
11. configure requested and excluded stores;
12. require provider-visible upload/validation confirmations;
13. persist a `ROUTENOTE_DRAFT_READY` release event with no status transition; and
14. write a private JSON receipt under `.songforge/routenote/receipts/<release-id>/`.

On success the CLI prints the `DRAFT_READY` outcome, local receipt path, approval ID when a new preparation was created, and the RouteNote draft URL when the provider exposes one.

By default the finished browser remains open for inspection. Close it normally when finished. Set `ROUTENOTE_CLOSE_BROWSER=1` to close it automatically after a successful draft preparation.

## Environment overrides

```text
ROUTENOTE_BROWSER_EXECUTABLE_PATH=/absolute/path/to/chrome
ROUTENOTE_PROFILE_DIR=/absolute/path/to/private-profile
ROUTENOTE_HEADLESS=1
ROUTENOTE_LOGIN_TIMEOUT_MS=900000
ROUTENOTE_CLOSE_BROWSER=1
```

`ROUTENOTE_HEADLESS=1` affects upload runs only. `routenote:login` always launches headed so interactive authentication remains possible.

If Chrome cannot be discovered automatically, set `ROUTENOTE_BROWSER_EXECUTABLE_PATH` to the installed Chrome/Chromium executable.

## Session expiry

If `routenote:upload` reports `ROUTENOTE_SESSION_REQUIRED`, rerun:

```bash
pnpm routenote:login
```

Authenticate normally, allow the command to detect the Distribution surface and close Chrome, then rerun the upload command.

The runner does not attempt to bypass MFA, CAPTCHA, anti-bot controls, account challenges, or RouteNote terms screens.

## Private local state

The following directory is gitignored:

```text
.songforge/routenote/
```

It can contain:

```text
browser-profile/   reusable RouteNote browser profile/session
cache/             materialized remote audio/artwork files
receipts/          DRAFT_READY execution receipts
```

Do not copy browser profile/session data into the repository or logs.

## Exact stopping boundary

Successful execution ends here:

```text
SongForge release
  -> validated RouteNote payload/hash
  -> verified local upload assets
  -> authenticated RouteNote browser profile
  -> create/resume draft
  -> metadata/audio/artwork/stores
  -> provider validation
  -> DRAFT_READY receipt
  -> STOP
```

`DRAFT_READY` is not submission evidence.

The runner does **not**:

- accept the RouteNote Artist/Label Agreement;
- click `Distribute Free`;
- call `ReleaseCommandService.recordExternalSubmission()`;
- transition the canonical release to `SUBMITTED`;
- claim RouteNote accepted, scheduled, or published the release.

Those remain separate evidence/authorization boundaries.

## Live calibration

Ordinary CI uses fakes and makes no RouteNote network calls. The first production use should therefore be treated as the provider-UI calibration run.

Run `pnpm routenote:login`, then run `pnpm routenote:upload <release-id>` against one authorized release draft. If RouteNote's current labels or page structure differ from the centralized selector contract, the adapter should fail closed rather than guess. Patch selector drift, rerun CI, and repeat the calibration until the draft reaches `DRAFT_READY` with the expected metadata and assets.
