# SongForge Production + RouteNote Execution Host

Status: implementation-prepared, not yet production-verified.

This record is evidence-first. A resource is marked verified only after an external or provider-side check proves it.

## Target architecture

- Public control surface: SongForge Next.js behind valid provider HTTPS.
- Application host: one existing Fly Machine, always on, with the reviewed 2 shared CPU / 2048 MiB runtime. Deployment refuses to resize smaller existing compute automatically.
- Database: external production PostgreSQL through `DATABASE_URL`; `prisma migrate deploy` is the production release command. Production seeding is intentionally omitted.
- Durable private storage: existing Fly volume `songforge_data` mounted at `/data`.
- RouteNote state: `/data/.songforge/routenote` mode 0700.
- Browser profile: `/data/.songforge/routenote/browser-profile` mode 0700.
- DRAFT_READY receipts: deterministic private files below `/data/.songforge/routenote/receipts` plus append-only database evidence.
- Canonical local media: `/data/media`. Production local asset paths must resolve inside this root, including after symlink resolution.
- Optional remote media: HTTPS only and exact hostname allowlist through `ROUTENOTE_ASSET_HOST_ALLOWLIST`; downloaded bytes are bounded and SHA-256 verified before upload.
- Browser: Alpine Chromium as unprivileged `nextjs`; DevTools binds only to 127.0.0.1 with an ephemeral port.
- Interactive login: Xvfb + x11vnc + websockify/noVNC bind to loopback. Nginx exposes the desktop only under `/routenote-desktop/` and authenticates every request through the RouteNote owner authority cookie.
- Owner control: server-only `ROUTENOTE_CONTROL_PASSPHRASE`, HMAC-signed HttpOnly SameSite=Strict cookie, Secure in production, 12-hour default maximum lifetime. Secret rotation invalidates existing authority cookies.

## Hard stop

Automation ends at `DRAFT_READY`. This production path does not implement RouteNote agreement acceptance, `Distribute Free`, external-submission recording, or `SUBMITTED`, `ACCEPTED`, `SCHEDULED`, or `LIVE` transitions.

## Production environment names

Required for deployment readiness:

- `DATABASE_URL`
- `APPROVAL_API_TOKEN`
- `ROUTENOTE_CONTROL_PASSPHRASE`

Runtime configuration:

- `ROUTENOTE_STATE_ROOT`
- `ROUTENOTE_PROFILE_DIR`
- `ROUTENOTE_MEDIA_ROOT`
- `ROUTENOTE_BROWSER_EXECUTABLE_PATH`
- `ROUTENOTE_HEADLESS`
- `ROUTENOTE_CLOSE_BROWSER`
- `ROUTENOTE_LOGIN_TIMEOUT_MS`
- `ROUTENOTE_ASSET_HOST_ALLOWLIST`
- `ROUTENOTE_ASSET_MAX_BYTES`
- `ROUTENOTE_ASSET_FETCH_TIMEOUT_MS`
- `ROUTENOTE_SELECTOR_CONTRACT_VERSION`
- `SONGFORGE_BUILD_SHA`

Secret values must never be written to this record, CI output, receipts, or browser logs.

## Deployment policy

The production workflow is manual-only and existing-resources-only. Before deployment it must prove:

1. the named Fly app already exists;
2. exactly one existing machine is present;
3. the expected persistent volume already exists;
4. `DATABASE_URL`, `ROUTENOTE_CONTROL_PASSPHRASE`, and `APPROVAL_API_TOKEN` secret names exist;
5. existing compute is at least the reviewed runtime size, otherwise deployment stops for a billing decision;
6. no RouteNote profile lease is active;
7. the requested verification URL is HTTPS.

It uses `--update-only`, runs deterministic Prisma migrations, verifies readiness externally, then writes a private marker to the volume, restarts the existing Machine, and proves the marker survived before deleting it.

The workflow never creates an app, Machine, volume, PostgreSQL database, DNS record, or secret.

## Backup and recovery

Fly volume snapshots are the first-line browser-profile/receipt/media recovery mechanism. Fly currently documents automatic daily volume snapshots as enabled by default, but production evidence must still inspect the actual volume and its snapshots before claiming backup coverage.

Database recovery depends on the selected production PostgreSQL provider. Before calibration, record its database identity, backup/PITR policy, retention, and restore procedure without copying credentials.

Recovery order:

1. stop RouteNote browser work and ensure no profile lease is active;
2. restore or attach the selected durable volume snapshot;
3. restore PostgreSQL to a compatible point if database recovery is also required;
4. start SongForge and require `/api/health/readiness` to pass;
5. check RouteNote connection without provider writes;
6. never reconstruct `DRAFT_READY` from a database event when its corresponding durable receipt is missing. That condition fails closed for operator review.

## Rollback

Rollback is an application-image change only. Do not replace or delete the production database or volume. Before rollback, require the profile lease to be absent. Deploy a previously verified image to the existing Machine with the same volume and PostgreSQL connection, then re-run external readiness and persistence checks.

## Calibration sequence

After infrastructure and RouteNote authentication are verified and Human Authority authorizes a provider-writing calibration:

1. select one completed canonical SongForge release;
2. require Audio, Artwork, Metadata, and Rights readiness;
3. check the retained RouteNote session;
4. run `Prepare RouteNote Draft` once;
5. confirm live RouteNote selectors/DOM through visible provider confirmations;
6. create or resume the provider draft, upload metadata/audio/artwork, configure requested stores, and validate provider errors;
7. persist the durable `DRAFT_READY` receipt and append-only database event;
8. inspect the provider draft;
9. stop before every final distribution action.

Any selector drift, provider ambiguity, missing confirmation, missing receipt, or storage inconsistency stops the run.

## Evidence ledger

| Evidence | Current state |
| --- | --- |
| PR #25 parent head | verified: `83671265665683ed4d8659e865d93ae5b36516a8` |
| Production-host branch | implementation in progress |
| Live SongForge HTTPS URL | unverified |
| Existing Fly app | unverified |
| Existing Fly Machine | unverified |
| Existing `songforge_data` volume | unverified |
| Production PostgreSQL | not yet verified |
| Migrations applied in production | not yet verified |
| Chromium production version | not yet verified |
| Private RouteNote storage | code/CI contract only; not yet production verified |
| Persistent profile across restart | not yet production verified |
| Owner authority in production | not yet production verified |
| Authenticated RouteNote profile | not yet established |
| Calibration release ID | none |
| DRAFT_READY receipt | none |
| Selector drift | not yet inspected against live provider UI |
| Final RouteNote distribution | not performed |
