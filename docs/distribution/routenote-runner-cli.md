# RouteNote Runner CLI

The RouteNote runner is the host-side ignition layer for SongForge's RouteNote draft automation. The **preferred operator surface is now the SongForge web control panel** at:

```text
/distribution/routenote
```

From that page an operator can unlock the protected RouteNote controls, connect/check RouteNote, select a canonical SongForge release, inspect Audio/Artwork/Metadata/Rights readiness, prepare the provider draft, and open the finished RouteNote draft without using a terminal.

The terminal commands remain available as diagnostic and host-bootstrap fallbacks:

```bash
pnpm routenote:login
pnpm routenote:upload <songforge-release-id>
```

The web page and CLI both use the same runner/browser/job/receipt implementation. Neither path creates a second release system.

The runner prepares RouteNote drafts only. It never accepts RouteNote agreements, clicks `Distribute Free`, records an external submission, or advances a SongForge release to `SUBMITTED`.

## Preferred no-terminal workflow

Open SongForge and choose **Distribute → RouteNote**.

1. On production hosts, unlock the RouteNote control surface with the **SongForge owner-control passphrase**. This is not your RouteNote account password.
2. **Connect RouteNote** starts the headed private RouteNote browser profile on the SongForge execution host and waits for normal operator authentication.
3. **Check connection** performs a current provider check. A profile directory existing on disk is not treated as proof of authentication.
4. Select a SongForge release. The page projects the canonical RouteNote checklist into **Audio**, **Artwork**, **Metadata**, and **Rights** readiness groups.
5. When the release is ready and RouteNote is connected, choose **Prepare RouteNote Draft**.
6. SongForge resolves and verifies the release assets, creates/resumes the provider draft, enters metadata, uploads audio/artwork, configures stores, and validates the provider state.
7. The surface ends at **DRAFT READY** and exposes **Open RouteNote Draft** when RouteNote provides a draft URL.

The mobile browser is a **control surface**. Browser automation executes on the SongForge host because it needs database access, release media, Chrome/Chromium, and the private RouteNote profile. If that host is remote and headless, the initial interactive RouteNote sign-in still requires an interactive browser host or an already-authenticated private profile. The web control panel does not relay RouteNote passwords, MFA prompts, CAPTCHA challenges, or a remote desktop into the phone.

## Owner-control gate for the web surface

The RouteNote web endpoints can launch browser automation and create provider drafts. A public SongForge deployment therefore must not expose them anonymously.

Production requires a server-only secret:

```text
ROUTENOTE_CONTROL_PASSPHRASE=<strong SongForge owner-control secret>
```

This is a **SongForge control secret**, not a RouteNote credential. The operator enters it in the SongForge RouteNote unlock screen. The server compares it locally and, on success, returns only a deterministic signed authority token in an `HttpOnly`, `SameSite=Strict`, `Secure` production cookie. The plaintext passphrase is not stored in the cookie and is never forwarded to RouteNote.

The authority cookie defaults to 12 hours. Rotating `ROUTENOTE_CONTROL_PASSPHRASE` invalidates existing authority cookies. Production without this secret fails closed with a configuration error. Local development without a configured secret may use the control surface without the additional unlock gate.

## Host prerequisites

For either the web control panel or CLI execution host:

- Node 20+; repository CI currently verifies Node 24.
- pnpm 9+ for the CLI fallback.
- A working SongForge database connection.
- Google Chrome or Chromium installed on the execution host.
- A writable private `.songforge/routenote/` state location, or an explicit `ROUTENOTE_PROFILE_DIR`.
- A SongForge release with a valid RouteNote preparation context, approved master, approved artwork, metadata, rights/provenance evidence, and asset SHA-256 values.
- For production web use, `ROUTENOTE_CONTROL_PASSPHRASE` configured as a server secret.

The runner does not require Playwright or a downloaded browser bundle. It launches installed Chrome/Chromium and controls the session through Chrome DevTools Protocol on loopback only.

## CLI fallback: establish the reusable RouteNote session

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

## CLI fallback: prepare a RouteNote draft

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

On success the CLI prints the `DRAFT_READY` outcome, local receipt path, approval ID when a new preparation was created, and the RouteNote draft URL when the provider exposes one. The web surface intentionally does **not** return the local receipt path to the browser.

By default the finished browser remains open for inspection. Close it normally when finished. Set `ROUTENOTE_CLOSE_BROWSER=1` to close it automatically after a successful draft preparation.

## Environment overrides

```text
ROUTENOTE_CONTROL_PASSPHRASE=<server-only SongForge owner-control secret>
ROUTENOTE_BROWSER_EXECUTABLE_PATH=/absolute/path/to/chrome
ROUTENOTE_PROFILE_DIR=/absolute/path/to/private-profile
ROUTENOTE_WORKSPACE_ROOT=/absolute/path/to/songforge
ROUTENOTE_HEADLESS=1
ROUTENOTE_LOGIN_TIMEOUT_MS=900000
ROUTENOTE_CLOSE_BROWSER=1
```

`ROUTENOTE_HEADLESS=1` affects draft execution only. Login always launches headed so interactive authentication remains possible.

If Chrome cannot be discovered automatically, set `ROUTENOTE_BROWSER_EXECUTABLE_PATH` to the installed Chrome/Chromium executable.

## Session expiry

The web surface maps an expired provider session to **LOGIN REQUIRED**. Use **Connect RouteNote** again on an interactive execution host.

The CLI equivalent is:

```bash
pnpm routenote:login
```

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

Do not copy browser profile/session data into the repository, API responses, browser UI, or logs.

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

The runner and web surface do **not**:

- accept the RouteNote Artist/Label Agreement;
- click `Distribute Free`;
- call `ReleaseCommandService.recordExternalSubmission()`;
- transition the canonical release to `SUBMITTED`;
- claim RouteNote accepted, scheduled, or published the release.

Those remain separate evidence/authorization boundaries.

## Live calibration

Ordinary CI uses fakes and makes no RouteNote network calls. The first production use should therefore be treated as the provider-UI calibration run.

Preferred path: open `/distribution/routenote`, satisfy the SongForge owner-control gate if required, establish a current RouteNote session, choose one authorized ready release, and press **Prepare RouteNote Draft**. The terminal commands remain available if the host needs direct diagnostic execution.

If RouteNote's current labels or page structure differ from the centralized selector contract, the adapter should fail closed rather than guess. Patch selector drift, rerun CI, and repeat the calibration until the draft reaches `DRAFT_READY` with the expected metadata and assets.
