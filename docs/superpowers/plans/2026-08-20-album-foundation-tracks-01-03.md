# BLAIZE SUNDAY Album Foundation + Tracks 01–03 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible, fail-closed album-curation pipeline and produce provenance-complete `CURATED_REFERENCE_MASTER` candidate packages for LOOKS EXPENSIVE, MY THERAPIST BLOCKED ME, and BAD DECISIONS, GREAT OUTFIT while explicitly blocking tracks 04–10 until their documented repair payload is surfaced.

**Architecture:** Add a focused `@songforge/album` TypeScript workspace package that owns album manifests, source/provenance records, media inspection, archive-master candidate rendering, checksums, and package validation. Binary inputs remain outside git in an ignored local-input map; generated media goes to an ignored `artifacts/album-build/` tree while machine-readable manifests, source-selection receipts, and QC receipts are committed. The first implementation does not claim native stems, canonical masters, release authorization, or final human master selection.

**Tech Stack:** Node.js 24+, TypeScript 5.9, pnpm 9.12, Node built-ins (`fs`, `path`, `crypto`, `child_process`, `node:test`), FFmpeg/ffprobe 7.1.5 or newer.

**Spec:** `docs/superpowers/specs/2026-08-20-blaize-album-curation-derived-production-edition-design.md`

## Global Constraints

- Public edition name: `BLAIZE SUNDAY — LOOKS EXPENSIVE, FEELS WEIRD — Archive Remaster / Derived Production Edition`.
- Catalog state for this edition: `CURATED_REFERENCE_MASTER`; `NATIVE_STEM_MASTER` is reserved for a future native-stem rebuild.
- Any asset created from a completed mix through source separation or remixing remains derived and must never be labelled original studio master, native instrumental, dry lead vocal, native vocal stem, native multitrack stem, or lossless-from-source master.
- A 24-bit / 48 kHz WAV or FLAC exported from a cleaned lossy source is a lossless delivery encoding of a derived result, not recovery of discarded MP3 information.
- Canon asset state, catalog state, evidence state, and song lifecycle status are separate fields and must never be collapsed into one status string.
- Source-separated components remain `DERIVED_REPAIR_ONLY`.
- Tracks 04–10 remain evidence state `BLOCKED_SOURCE_MISSING` until the original repair payload is surfaced or an explicitly authorized recovery-separation branch exists.
- No zero-byte placeholders may stand in for missing deliverables.
- Generated cover/video candidates remain `CANDIDATE` until human approval.
- Missing human approval may yield `COMPLETE_PENDING_HUMAN_APPROVAL`, never public-release authorization.
- No public post, distribution submission, rights claim, spend, or release publication is part of this plan.

---

## File Structure

### New package

- Create `packages/album/package.json` — workspace package definition and album CLI scripts.
- Create `packages/album/tsconfig.json` — package TypeScript config using existing repo conventions.
- Create `packages/album/src/types.ts` — state enums/interfaces for track, asset, source, provenance, QC, and manifest records.
- Create `packages/album/src/catalog.ts` — immutable ten-track catalog definition and required deliverable names.
- Create `packages/album/src/manifest.ts` — build package tree and album manifest from catalog + source state.
- Create `packages/album/src/provenance.ts` — SHA-256, source receipt, parent/derivative relationships.
- Create `packages/album/src/media.ts` — ffprobe inspection and media-property normalization.
- Create `packages/album/src/mastering.ts` — deterministic archive-master candidate rendering via ffmpeg.
- Create `packages/album/src/validator.ts` — naming, state, media, checksum, and completeness validation.
- Create `packages/album/src/cli.ts` — `bootstrap`, `audit`, `render`, `validate`, and `receipt` commands.
- Create focused `*.test.ts` files next to each implementation module.

### Album metadata tracked in git

- Create `album/edition/ALBUM_METADATA.json` — public/internal edition metadata.
- Create `album/edition/TRACKLIST.md` — ten-track order, visual mode, signature system sound, and current payload state.
- Create `album/edition/source-state.json` — known source status for all ten tracks.
- Create `album/edition/source-selection/.gitkeep` — generated source-selection receipts land here.
- Create `album/edition/qc/.gitkeep` — generated QC receipts land here.
- Create `album/edition/README.md` — explains what is tracked in git versus generated locally.

### Ignored local/generated content

- Modify `.gitignore` to add `album/local-inputs/` and `artifacts/album-build/`.
- Local execution creates `album/local-inputs/source-map.json`; this file is never committed because it contains environment-specific paths.
- Generated media lands under `artifacts/album-build/BLAIZE_SUNDAY_LOOKS_EXPENSIVE_FEELS_WEIRD/` and is packaged separately for handoff/library upload.

### Root scripts

- Modify root `package.json` to add `album:bootstrap`, `album:audit`, `album:render`, and `album:validate` wrappers.

---

### Task 1: Scaffold `@songforge/album` and lock state contracts

**Files:**
- Create: `packages/album/package.json`
- Create: `packages/album/tsconfig.json`
- Create: `packages/album/src/types.ts`
- Create: `packages/album/src/types.test.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces `CanonAssetState`, `CatalogState`, `EvidenceState`, `SongLifecycleStatus`, `ManifestPresence`, `AlbumAssetRecord`, `TrackRecord`.
- Later tasks import these types directly from `@songforge/album` package internals.

- [ ] **Step 1: Write the failing state-contract test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidStateCombination,
  type AlbumAssetRecord,
} from "./types.ts";

test("derived repair assets cannot claim native-stem catalog state", () => {
  const asset: AlbumAssetRecord = {
    assetId: "01-vocal-derived",
    trackId: "01_LOOKS_EXPENSIVE",
    filename: "01_LOOKS_EXPENSIVE_INSTRUMENTAL_DERIVED.wav",
    canonAssetState: "DERIVED_REPAIR_ONLY",
    catalogState: "NATIVE_STEM_MASTER",
    evidenceState: "VERIFIED",
    presence: "present_verified",
    nativeStem: false,
    canonical: false,
  };

  assert.throws(() => assertValidStateCombination(asset), /DERIVED_REPAIR_ONLY/);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm --filter @songforge/album test`

Expected: FAIL because the package and `assertValidStateCombination` do not exist.

- [ ] **Step 3: Create package metadata and state types**

`packages/album/package.json`:

```json
{
  "name": "@songforge/album",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "node --test src/*.test.ts",
    "bootstrap": "node --experimental-strip-types --no-warnings=ExperimentalWarning src/cli.ts bootstrap",
    "audit": "node --experimental-strip-types --no-warnings=ExperimentalWarning src/cli.ts audit",
    "render": "node --experimental-strip-types --no-warnings=ExperimentalWarning src/cli.ts render",
    "validate": "node --experimental-strip-types --no-warnings=ExperimentalWarning src/cli.ts validate"
  },
  "dependencies": {
    "@songforge/storage": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^24.3.0",
    "typescript": "^5.9.2"
  }
}
```

`types.ts` must define literal unions exactly:

```ts
export type CanonAssetState =
  | "CANONICAL"
  | "APPROVED_PRODUCTION_ASSET"
  | "CANDIDATE"
  | "EXPERIMENT"
  | "SUPERSEDED"
  | "REJECTED"
  | "DERIVED_REPAIR_ONLY";

export type CatalogState = "CURATED_REFERENCE_MASTER" | "NATIVE_STEM_MASTER";
export type EvidenceState = "VERIFIED" | "UNVERIFIED" | "UNKNOWN" | "CONFLICTING" | "BLOCKED_SOURCE_MISSING";
export type SongLifecycleStatus = "CONCEPT" | "WRITING" | "DEMO" | "SELECTED" | "QA" | "RELEASE_READY" | "PUBLISHED" | "ARCHIVED";
export type ManifestPresence = "present_verified" | "present_needs_human_approval" | "blocked_source_missing" | "not_applicable";
```

`assertValidStateCombination()` must reject any `DERIVED_REPAIR_ONLY` asset with `catalogState === "NATIVE_STEM_MASTER"` and any `nativeStem === false` asset marked `canonical === true`.

- [ ] **Step 4: Add root scripts and ignored paths**

Add to root `package.json` scripts:

```json
"album:bootstrap": "pnpm --filter @songforge/album bootstrap",
"album:audit": "pnpm --filter @songforge/album audit",
"album:render": "pnpm --filter @songforge/album render",
"album:validate": "pnpm --filter @songforge/album validate"
```

Append to `.gitignore`:

```text
album/local-inputs/
artifacts/album-build/
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @songforge/album test
pnpm --filter @songforge/album typecheck
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/album package.json .gitignore
git commit -m "feat(album): add album state contracts"
```

---

### Task 2: Encode the ten-track catalog and manifest skeleton

**Files:**
- Create: `packages/album/src/catalog.ts`
- Create: `packages/album/src/catalog.test.ts`
- Create: `packages/album/src/manifest.ts`
- Create: `packages/album/src/manifest.test.ts`
- Create: `album/edition/ALBUM_METADATA.json`
- Create: `album/edition/TRACKLIST.md`
- Create: `album/edition/source-state.json`
- Create: `album/edition/source-selection/.gitkeep`
- Create: `album/edition/qc/.gitkeep`
- Create: `album/edition/README.md`

**Interfaces:**
- Produces `TRACKS`, `requiredDeliverables(track)`, `buildAlbumManifest(sourceState)`, and `bootstrapAlbumTree(outputRoot)`.
- Later tasks use manifest entries as the only package-completeness source.

- [ ] **Step 1: Write the failing catalog test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { TRACKS, requiredDeliverables } from "./catalog.ts";

test("catalog contains exactly the approved ten tracks", () => {
  assert.equal(TRACKS.length, 10);
  assert.equal(TRACKS[0]?.id, "01_LOOKS_EXPENSIVE");
  assert.equal(TRACKS[9]?.id, "10_WRONG_FLOOR");
  assert.equal(requiredDeliverables(TRACKS[0]!).length, 18);
});
```

The 18 required deliverables per track are 3 master files, 6 alternates, 3 art files, 4 video/treatment files, and 2 machine-critical metadata files (`provenance.json`, `audio_qc.json`). Lyrics, credits, and checksums are tracked as required metadata support files but do not change the 18 media/primary-manifest count.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @songforge/album test`

Expected: FAIL because `catalog.ts` does not exist.

- [ ] **Step 3: Implement immutable track definitions**

Each catalog entry must include exact ID/title plus these signature sounds:

```ts
export const TRACKS = [
  { id: "01_LOOKS_EXPENSIVE", title: "LOOKS EXPENSIVE", visualMode: "Luxury Noir", signatureSound: "card-reader decline" },
  { id: "02_MY_THERAPIST_BLOCKED_ME", title: "MY THERAPIST BLOCKED ME", visualMode: "Beautiful but Wrong", signatureSound: "customer-service hold music" },
  { id: "03_BAD_DECISIONS_GREAT_OUTFIT", title: "BAD DECISIONS, GREAT OUTFIT", visualMode: "Flash / Motion / Flex", signatureSound: "camera autofocus motor" },
  { id: "04_PRETTY_BOY_PROBLEMS", title: "PRETTY BOY PROBLEMS", visualMode: "Flash / Motion / Flex", signatureSound: "perfume atomizer" },
  { id: "05_DELETE_AFTER_LISTENING", title: "DELETE AFTER LISTENING", visualMode: "Luxury Noir", signatureSound: "voice-message deletion tone" },
  { id: "06_NO_SIGNAL", title: "NO SIGNAL", visualMode: "Beautiful but Wrong", signatureSound: "cellular dropout / modem fragments" },
  { id: "07_2_17_AM", title: "2:17 AM", visualMode: "Luxury Noir", signatureSound: "hotel HVAC / elevator bell / unread notification" },
  { id: "08_PARALLEL_YOU", title: "PARALLEL YOU", visualMode: "Flash / Motion / Flex", signatureSound: "reversed navigation prompts" },
  { id: "09_ROOM_SERVICE_FOR_ONE", title: "ROOM SERVICE FOR ONE", visualMode: "Luxury Noir", signatureSound: "room-service cart / cloche / receipt printer" },
  { id: "10_WRONG_FLOOR", title: "WRONG FLOOR", visualMode: "Beautiful but Wrong", signatureSound: "elevator ding / floor voice / vending-machine hum" }
] as const;
```

- [ ] **Step 4: Implement manifest generation and fail-closed track state**

`buildAlbumManifest()` must mark tracks 01–03 source-backed and tracks 04–10 `blocked_source_missing` until source state explicitly changes to `VERIFIED`.

Example assertion:

```ts
assert.equal(manifest.tracks[3].evidenceState, "BLOCKED_SOURCE_MISSING");
assert.equal(manifest.tracks[3].deliverables[0].presence, "blocked_source_missing");
```

- [ ] **Step 5: Create album metadata files**

`ALBUM_METADATA.json` must contain:

```json
{
  "artist": "BLAIZE SUNDAY",
  "title": "LOOKS EXPENSIVE, FEELS WEIRD",
  "edition": "Archive Remaster / Derived Production Edition",
  "catalog_state": "CURATED_REFERENCE_MASTER",
  "future_catalog_state_reserved": "NATIVE_STEM_MASTER",
  "release_authorized": false
}
```

`source-state.json` must mark 01–03 `VERIFIED` and 04–10 `BLOCKED_SOURCE_MISSING` with `documented_render_evidence: true` for 04–10.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @songforge/album test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/album/src/catalog* packages/album/src/manifest* album/edition
git commit -m "feat(album): encode ten-track edition manifest"
```

---

### Task 3: Add provenance and checksum receipts

**Files:**
- Create: `packages/album/src/provenance.ts`
- Create: `packages/album/src/provenance.test.ts`

**Interfaces:**
- Consumes `contentHash()` from `@songforge/storage`.
- Produces `hashFile(path)`, `writeProvenanceReceipt(record, path)`, `writeChecksumFile(entries, path)`.

- [ ] **Step 1: Write failing checksum/provenance tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashFile } from "./provenance.ts";

test("hashFile returns stable SHA-256 for source evidence", async () => {
  const dir = await mkdtemp(join(tmpdir(), "album-prov-"));
  const file = join(dir, "source.bin");
  await writeFile(file, "blaize");
  assert.match(await hashFile(file), /^[a-f0-9]{64}$/);
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @songforge/album test`

Expected: FAIL because `provenance.ts` does not exist.

- [ ] **Step 3: Implement provenance receipts**

A receipt must serialize stable JSON with at least:

```ts
{
  assetId,
  trackId,
  filename,
  canonAssetState,
  catalogState,
  evidenceState,
  parentAssets,
  sha256,
  sourceSha256,
  sourceType,
  derivationMethod,
  nativeStem,
  canonical,
  limitationNotice,
  createdAt
}
```

For all archive-remaster outputs in this plan, `nativeStem` is `false` and `canonical` is `false` unless an unrelated approved visual/metadata asset explicitly uses another state.

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @songforge/album test
pnpm --filter @songforge/album typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/album/src/provenance*
git commit -m "feat(album): add provenance and checksum receipts"
```

---

### Task 4: Implement ffprobe media inspection and technical audio audit

**Files:**
- Create: `packages/album/src/media.ts`
- Create: `packages/album/src/media.test.ts`

**Interfaces:**
- Produces `inspectMedia(path): Promise<MediaInspection>` and `assertAudioDecodes(inspection)`.
- `MediaInspection` includes codec, durationSeconds, sampleRateHz, channels, bitDepth when known, formatName, bitRate when known.

- [ ] **Step 1: Write failing parser test using synthetic ffprobe JSON**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProbe } from "./media.ts";

test("normalizeProbe extracts 24-bit 48 kHz PCM properties", () => {
  const inspection = normalizeProbe({
    streams: [{ codec_type: "audio", codec_name: "pcm_s24le", sample_rate: "48000", channels: 2, bits_per_raw_sample: "24" }],
    format: { duration: "208.091438", format_name: "wav" }
  });
  assert.equal(inspection.sampleRateHz, 48000);
  assert.equal(inspection.bitDepth, 24);
  assert.equal(inspection.channels, 2);
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @songforge/album test`

Expected: FAIL because `normalizeProbe` is missing.

- [ ] **Step 3: Implement ffprobe execution**

Use `execFile("ffprobe", ["-v","error","-show_streams","-show_format","-of","json", path])`. Throw `FFPROBE_UNAVAILABLE` when executable launch fails with `ENOENT`, and `MEDIA_PROBE_FAILED` when ffprobe exits non-zero.

- [ ] **Step 4: Add an integration test that generates a tiny WAV with ffmpeg**

The test must create a 0.25-second sine file:

```bash
ffmpeg -v error -f lavfi -i sine=frequency=440:duration=0.25 -ar 48000 -c:a pcm_s24le fixture.wav
```

Then assert `inspectMedia()` returns codec `pcm_s24le`, sample rate `48000`, and bit depth `24`. Skip only when ffmpeg/ffprobe is genuinely unavailable; do not convert tool absence into PASS.

- [ ] **Step 5: Run test and typecheck**

```bash
pnpm --filter @songforge/album test
pnpm --filter @songforge/album typecheck
```

Expected: PASS on the production environment with FFmpeg 7.1.5+.

- [ ] **Step 6: Commit**

```bash
git add packages/album/src/media*
git commit -m "feat(album): add media inspection and audio audit"
```

---

### Task 5: Implement deterministic archive-master candidate rendering

**Files:**
- Create: `packages/album/src/mastering.ts`
- Create: `packages/album/src/mastering.test.ts`

**Interfaces:**
- Consumes `MediaInspection` and source-selection receipt.
- Produces `renderArchiveMasterCandidate({ inputPath, outputWav, outputFlac, outputMp3, profile })`.
- `MasteringProfile` has explicit fields; there is no implicit album-wide EQ/compression preset.

- [ ] **Step 1: Write failing profile-validation test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { validateMasteringProfile } from "./mastering.ts";

test("mastering profile rejects implicit defaults", () => {
  assert.throws(
    () => validateMasteringProfile({ trackId: "01_LOOKS_EXPENSIVE" } as never),
    /explicit profile/
  );
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @songforge/album test`

Expected: FAIL because `mastering.ts` does not exist.

- [ ] **Step 3: Implement explicit mastering profiles**

Use this interface:

```ts
export interface MasteringProfile {
  trackId: string;
  sourceSelectionReceipt: string;
  highpassHz: number | null;
  lowShelfHz: number | null;
  lowShelfDb: number;
  highShelfHz: number | null;
  highShelfDb: number;
  outputGainDb: number;
  applyCompressor: boolean;
  compressor?: { thresholdDb: number; ratio: number; attackMs: number; releaseMs: number };
  note: string;
}
```

No field may be silently defaulted except `compressor` when `applyCompressor === false`.

- [ ] **Step 4: Implement WAV/FLAC/MP3 export**

Build one ffmpeg filter chain only from non-null/non-zero profile fields. Export:

```text
ARCHIVE_MASTER_24-48.wav -> pcm_s24le, 48000 Hz
MASTER.flac               -> flac from the archive-master WAV
REFERENCE_320.mp3         -> libmp3lame, 320k from the archive-master WAV
```

The FLAC and MP3 exports must use the already rendered archive-master WAV as parent, not independently re-run the mastering chain.

- [ ] **Step 5: Add deterministic integration test**

Generate a synthetic source, render with a known profile, and assert:

```ts
assert.equal(wav.sampleRateHz, 48000);
assert.equal(wav.bitDepth, 24);
assert.equal(mp3.bitRate, 320000);
assert.ok(Math.abs(wav.durationSeconds - flac.durationSeconds) < 0.01);
```

- [ ] **Step 6: Run tests/typecheck**

```bash
pnpm --filter @songforge/album test
pnpm --filter @songforge/album typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/album/src/mastering*
git commit -m "feat(album): add archive-master rendering pipeline"
```

---

### Task 6: Implement CLI, local source map, and source-selection receipts

**Files:**
- Create: `packages/album/src/cli.ts`
- Create: `packages/album/src/cli.test.ts`
- Local only during execution: `album/local-inputs/source-map.json`
- Generated/committed during execution: `album/edition/source-selection/01_LOOKS_EXPENSIVE.json`
- Generated/committed during execution: `album/edition/source-selection/02_MY_THERAPIST_BLOCKED_ME.json`
- Generated/committed during execution: `album/edition/source-selection/03_BAD_DECISIONS_GREAT_OUTFIT.json`

**Interfaces:**
- CLI commands: `bootstrap`, `audit`, `render`, `validate`, `receipt`.
- `audit` emits source-selection receipts but never mutates media.

- [ ] **Step 1: Write failing CLI argument test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseCli } from "./cli.ts";

test("audit requires an explicit source map", () => {
  assert.throws(() => parseCli(["audit"]), /--source-map/);
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @songforge/album test`

Expected: FAIL because CLI is missing.

- [ ] **Step 3: Implement source-map schema**

The untracked local file uses exact keys:

```json
{
  "01_LOOKS_EXPENSIVE": [
    { "role": "original_full_mix", "path": "/absolute/path/to/original.mp3" },
    { "role": "cleaned_candidate", "path": "/absolute/path/to/Looks_Expensive_Clean_Master.wav" }
  ],
  "02_MY_THERAPIST_BLOCKED_ME": [],
  "03_BAD_DECISIONS_GREAT_OUTFIT": []
}
```

Execution must populate all three arrays with the materialized Library files before audit.

- [ ] **Step 4: Implement `audit` receipt generation**

For each candidate compute SHA-256, ffprobe properties, and classify `sourceType`. The receipt must record all candidates and one `selectionStatus` value:

- `selected_for_archive_candidate`
- `alternate_only`
- `rejected_corrupt`
- `needs_human_a_b`

The CLI must never silently choose between materially different mixes. If original and cleaned candidate are both valid and neither is byte-equivalent, set `needs_human_a_b` unless the candidate name/lineage explicitly identifies it as the already approved source for this edition.

- [ ] **Step 5: Run audit against the six accessible proof-cycle files**

Materialize and map:

```text
“Looks Expensive”.mp3
Looks_Expensive_Clean_Master.wav
“My Therapist Blocked Me”.mp3
My_Therapist_Blocked_Me_Music_Forward_Clean_Edit.wav
“Bad Decisions”.mp3
Bad_Decisions_Music_Forward_Clean_Edit.wav
```

Run:

```bash
pnpm album:audit -- --source-map album/local-inputs/source-map.json --write-receipts album/edition/source-selection
```

Expected: three JSON receipts with source hashes and no corrupt-file state.

- [ ] **Step 6: Commit generated source-selection receipts**

```bash
git add album/edition/source-selection/*.json
git commit -m "chore(album): record proof-cycle source selection evidence"
```

---

### Task 7: Render proof-cycle archive-master candidates and provenance sidecars

**Files:**
- Generated local media under `artifacts/album-build/.../01_*`, `02_*`, `03_*`
- Generated/committed: `album/edition/qc/01_LOOKS_EXPENSIVE.json`
- Generated/committed: `album/edition/qc/02_MY_THERAPIST_BLOCKED_ME.json`
- Generated/committed: `album/edition/qc/03_BAD_DECISIONS_GREAT_OUTFIT.json`
- Generated/committed: `album/edition/mastering-profiles/01_LOOKS_EXPENSIVE.json`
- Generated/committed: `album/edition/mastering-profiles/02_MY_THERAPIST_BLOCKED_ME.json`
- Generated/committed: `album/edition/mastering-profiles/03_BAD_DECISIONS_GREAT_OUTFIT.json`

**Interfaces:**
- Consumes source-selection receipts and explicit mastering profiles.
- Produces WAV, FLAC, MP3 candidate masters plus `provenance.json`, `audio_qc.json`, and `checksums.sha256` per track.

- [ ] **Step 1: Create mastering profiles only after reading audit receipts**

Use these decision rules, applied per track rather than globally:

1. If the selected source is already a cleaned 24/48 WAV and audit shows no decode/format issue, begin with a neutral profile: all EQ fields `null`, gain `0`, compressor `false`.
2. If low-end reduction is still required after source comparison, change only the low-frequency fields and record the reason in `note`; do not add compression merely to increase loudness.
3. If the music-forward source is intentionally vocal-reduced, classify it as an alternate and do not use it as the archive master unless the source-selection receipt explicitly records a human/authorized selection.
4. Any candidate with audible or measurable defects that cannot be corrected without aggressive processing remains `CANDIDATE`, not `APPROVED_PRODUCTION_ASSET`.

- [ ] **Step 2: Render all source-backed candidate masters**

Run one command per track:

```bash
pnpm album:render -- --track 01_LOOKS_EXPENSIVE --profile album/edition/mastering-profiles/01_LOOKS_EXPENSIVE.json --source-map album/local-inputs/source-map.json --output artifacts/album-build/BLAIZE_SUNDAY_LOOKS_EXPENSIVE_FEELS_WEIRD
```

Repeat for tracks 02 and 03.

- [ ] **Step 3: Generate per-track provenance/checksums**

Each master sidecar must include:

```json
{
  "canonAssetState": "CANDIDATE",
  "catalogState": "CURATED_REFERENCE_MASTER",
  "evidenceState": "VERIFIED",
  "nativeStem": false,
  "canonical": false,
  "limitationNotice": "Lossless delivery encoding derived from potentially lossy or previously processed source; not lossless-from-source and not a native-stem master."
}
```

- [ ] **Step 4: Produce QC receipts**

Verify per track:

- WAV decodes;
- WAV is 48 kHz / 24-bit;
- FLAC decodes;
- FLAC duration matches WAV within 0.01 s;
- MP3 bitrate is 320 kbps;
- no output is accidentally truncated relative to selected parent;
- all three exports have SHA-256 entries;
- sidecars exist;
- no derived/native terminology violation exists.

Set receipt completion state to `COMPLETE_PENDING_HUMAN_APPROVAL` when technical checks pass but final A/B selection remains outstanding.

- [ ] **Step 5: Commit profiles and QC receipts, not binary media**

```bash
git add album/edition/mastering-profiles album/edition/qc
git commit -m "feat(album): build proof-cycle archive-master candidates"
```

---

### Task 8: Add full package validator and blocked-source enforcement

**Files:**
- Create: `packages/album/src/validator.ts`
- Create: `packages/album/src/validator.test.ts`

**Interfaces:**
- Produces `validateAlbumPackage({ root, manifest }): Promise<ValidationReport>`.
- Validation report has `status: "PASS" | "FAIL"`, `errors`, `warnings`, `blockedSources`, and `verifiedAssets`.

- [ ] **Step 1: Write failing native-label lint test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { lintDerivativeTerminology } from "./validator.ts";

test("rejects native label on derived filenames", () => {
  assert.deepEqual(
    lintDerivativeTerminology("01_LOOKS_EXPENSIVE_NATIVE_INSTRUMENTAL.wav", { nativeStem: false }),
    ["derived asset must not use native terminology"]
  );
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @songforge/album test`

Expected: FAIL because validator is missing.

- [ ] **Step 3: Implement validation rules**

Fail on:

- expected present asset missing;
- hash mismatch;
- zero-byte media file;
- invalid JSON sidecar;
- native terminology when `nativeStem === false`;
- `NATIVE_STEM_MASTER` on any current-edition derived audio;
- source-backed WAV not 48 kHz/24-bit;
- reference MP3 not 320 kbps;
- checksum file missing an emitted asset.

Do **not** fail merely because tracks 04–10 are blocked when manifest correctly says `blocked_source_missing`; report them under `blockedSources` and prohibit overall `VERIFIED_COMPLETE` state.

- [ ] **Step 4: Add blocked-source integration fixture**

Create a temp manifest with tracks 04–10 blocked and assert:

```ts
assert.equal(report.status, "PASS");
assert.equal(report.blockedSources.length, 7);
assert.equal(report.completionState, "BLOCKED");
```

Technical package validation can pass while project completion remains blocked.

- [ ] **Step 5: Run all package tests/typecheck**

```bash
pnpm --filter @songforge/album test
pnpm --filter @songforge/album typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/album/src/validator*
git commit -m "feat(album): enforce album package validation"
```

---

### Task 9: Bootstrap final ten-track tree, generate album-level receipt, and verify CI compatibility

**Files:**
- Generated local package: `artifacts/album-build/BLAIZE_SUNDAY_LOOKS_EXPENSIVE_FEELS_WEIRD/`
- Generated/committed: `album/edition/ALBUM_MANIFEST.json`
- Generated/committed: `album/edition/RELEASE_READINESS.md`
- Generated/committed: `album/edition/NATIVE_STEM_REPLACEMENT_MAP.md`
- Generated/committed: `album/edition/IMPLEMENTATION_RECEIPT.json`

**Interfaces:**
- `bootstrap` creates all ten directories and required subdirectories without fake media placeholders.
- `receipt` summarizes source states, verified outputs, blocked tracks, tests, and human-approval boundary.

- [ ] **Step 1: Bootstrap the ten-track package**

Run:

```bash
pnpm album:bootstrap -- --output artifacts/album-build/BLAIZE_SUNDAY_LOOKS_EXPENSIVE_FEELS_WEIRD
```

Expected: complete directory structure for all ten tracks; no zero-byte media placeholders.

- [ ] **Step 2: Generate final manifest and readiness report**

Run:

```bash
pnpm album:validate -- --root artifacts/album-build/BLAIZE_SUNDAY_LOOKS_EXPENSIVE_FEELS_WEIRD --manifest album/edition/ALBUM_MANIFEST.json --write-report album/edition/IMPLEMENTATION_RECEIPT.json
```

Expected project state for this first plan:

```text
Tracks 01–03: technical candidate package present and verified
Tracks 04–10: BLOCKED_SOURCE_MISSING
Overall: BLOCKED, not VERIFIED_COMPLETE
Human master approval: pending
Public release authorization: false
```

- [ ] **Step 3: Write native-stem replacement map**

For every current master filename, map the future replacement path to the same public track ID and metadata namespace so future `NATIVE_STEM_MASTER` audio can supersede audio without rebuilding art/video/metadata. The map must explicitly state that replacement requires native dry lead, backing/harmony, doubles/ad-libs, spoken material, FX returns, drums, bass, melodic material, effects/transitions, instrumental, and full mix.

- [ ] **Step 4: Run repository verification**

Run fresh commands:

```bash
pnpm --filter @songforge/album test
pnpm --filter @songforge/album typecheck
pnpm test
pnpm typecheck
pnpm format:check
```

Expected:

- album package tests PASS;
- album typecheck PASS;
- repository test/typecheck must not regress from branch baseline;
- if `format:check` still reports pre-existing repository warnings, record exact count and changed-file attribution in `IMPLEMENTATION_RECEIPT.json`; do not call the repository clean until changed album files themselves pass Prettier.

- [ ] **Step 5: Commit tracked receipts/metadata**

```bash
git add album/edition
git commit -m "chore(album): record proof-cycle package verification"
```

- [ ] **Step 6: Verify branch diff is scoped**

Run:

```bash
git diff --stat main...HEAD
git diff --check main...HEAD
```

Expected: only album package, album metadata/receipts, root scripts, `.gitignore`, spec, and plan changes; `git diff --check` exits 0.

---

## Self-Review Results

### Spec coverage

This plan covers the approved first implementation unit only:

- package schema and state semantics;
- ten-track manifest and blocked-source representation;
- proof-cycle source audit;
- proof-cycle archive-master candidate WAV/FLAC/320-MP3 pipeline;
- provenance/checksums/QC;
- package validation;
- native-stem replacement path;
- repository verification.

Deliberately deferred into separate implementation plans because they are independently reviewable subsystems:

1. recovery/search + reconciliation of the original repair payload for tracks 04–10;
2. Era One artwork/continuity system and ten cover families;
3. visualizer/lyric-video/hero-video pipeline;
4. final album-wide packaging after all ten audio payloads are present.

### Placeholder scan

No `TBD`, `TODO`, “implement later,” or unspecified validation steps remain. Dynamic values such as source hashes, ffprobe properties, and mastering-profile decisions are explicitly generated from the real source audit rather than guessed in the plan.

### Type consistency

State names, manifest-presence values, catalog state, and completion-state semantics match the approved design. `DERIVED_REPAIR_ONLY` is a Canon asset state; `CURATED_REFERENCE_MASTER` is a catalog state; `BLOCKED_SOURCE_MISSING` is an evidence state; song lifecycle remains independent.
