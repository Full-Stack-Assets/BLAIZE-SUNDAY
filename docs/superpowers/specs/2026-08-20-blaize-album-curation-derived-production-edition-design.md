# BLAIZE SUNDAY Album Curation, Remastering, and Visual Campaign Design

**Date:** 2026-08-20  
**Status:** APPROVED DESIGN / IMPLEMENTATION NOT YET STARTED  
**Branch:** `album/archive-remaster-derived-edition`  
**Public edition name:** `BLAIZE SUNDAY — LOOKS EXPENSIVE, FEELS WEIRD — Archive Remaster / Derived Production Edition`  
**Internal catalog state:** `CURATED_REFERENCE_MASTER`  
**Reserved future catalog state:** `NATIVE_STEM_MASTER`

## 1. Purpose

Build the highest-quality, technically honest, provenance-complete BLAIZE SUNDAY album package that the currently available source material can support. The package must be usable for publishing preparation, promotion, performance, visual production, pitching, and archival work without misrepresenting source-separated or lossy-source material as native production assets.

This project extends the existing BLAIZE proof-cycle work into an archival/production edition. It does **not** replace the Version 4 Canon, waive G0–G12, or authorize public release. Human approval remains required for final master selection, final identity-critical artwork, rights assertions, distribution submission, and publication.

## 2. Authority and source precedence

Implementation uses the following hierarchy for this work item:

1. Current explicit Human Authority for the Album Curation, Remastering, and Visual Campaign Brief.
2. `BLAIZE_SUNDAY_FULL_MASTER_v4.md` for artist identity, proof-cycle priorities, voice/visual/sonic governance, gates, and approval boundaries.
3. `BLAIZE SUNDAY — Derived Repair Package.docx` and `DERIVED_REPAIR_PACKAGE_METADATA.json` for derivative lineage.
4. `BLAIZE SUNDAY — Derived Repair Package Validation.pdf` for structural duration/alignment evidence.
5. `BLAIZE SUNDAY Stem-Preserving Production Standard.pdf` for the native-stem future path.
6. `BLAIZE SUNDAY — Luxury Glitch Prompting Playbook.md` for production and visual prompting discipline.

A lower-authority document cannot convert a derived asset into a native stem or a canonical master.

## 3. Reuse decision

**Decision: `EXTEND_EXISTING` + `MERGE_WITH_EXISTING`**

Reuse:

- existing full-mix references,
- existing derived repair metadata and validation,
- existing proof-cycle masters/clean edits where accessible,
- existing lyric package,
- existing visual reference photographs,
- existing generated visual candidates,
- existing voice evidence and Canon,
- existing video-factory architecture where useful.

Do not create a parallel artist system or duplicate provenance ledger.

## 4. Non-negotiable truth model

### 4.1 Derived assets

Any asset created from a completed stereo/mono mix through source separation or remixing remains **derived**.

It must never be labelled:

- Original studio master
- Native instrumental
- Dry lead vocal
- Native vocal stem
- Native multitrack stem
- Lossless-from-source master

### 4.2 Lossless delivery versus lossless source

A 24-bit / 48 kHz WAV or FLAC exported from a cleaned lossy source is a **lossless delivery encoding of a derived result**, not a recovery of discarded MP3 information.

### 4.3 Native future edition

`NATIVE_STEM_MASTER` is reserved for sessions that preserve independently created/recorded, synchronized components before mixdown, including dry lead, backing/harmony, doubles/ad-libs, spoken material, vocal FX returns, drums, bass, melodic material, effects/transitions, full instrumental, and full mix.

## 5. Current evidence state

### 5.1 Verified accessible song audio

The currently accessible Library contains complete song audio for the proof-cycle tracks:

1. `LOOKS EXPENSIVE`
   - original MP3 reference
   - `Looks_Expensive_Clean_Master.wav`
   - cleaned MP3 derivative
2. `MY THERAPIST BLOCKED ME`
   - original MP3 reference
   - `My_Therapist_Blocked_Me_Music_Forward_Clean_Edit.wav`
   - cleaned MP3 derivative
3. `BAD DECISIONS, GREAT OUTFIT`
   - original MP3 reference
   - `Bad_Decisions_Music_Forward_Clean_Edit.wav`
   - cleaned MP3 derivative

### 5.2 Documented but payload-pending tracks

Tracks 4–10 have machine-readable metadata defining source hashes, duration, format, and four derived WAV assets per track. Their actual audio payload is not currently surfaced in the accessible archive set.

These tracks are therefore classified:

`DOCUMENTED / PAYLOAD_NOT_YET_LOCATED`

They must not receive fabricated audio deliverables.

### 5.3 Visual evidence

The project has a large user-supplied likeness-reference set plus generated campaign candidates. Visual references are evidence for identity continuity, not automatic canonical approvals.

## 6. Album filesystem

```text
BLAIZE_SUNDAY_LOOKS_EXPENSIVE_FEELS_WEIRD/
├── 00_ALBUM/
│   ├── ALBUM_MANIFEST.json
│   ├── ALBUM_METADATA.json
│   ├── TRACKLIST.md
│   ├── CATALOG_STATE.md
│   ├── RELEASE_READINESS.md
│   └── checksums.sha256
├── 00_EVIDENCE/
│   ├── SOURCE_AUDIO/
│   ├── DERIVED_REPAIR_ORIGINAL/
│   ├── VOICE_EVIDENCE/
│   ├── VISUAL_REFERENCES/
│   ├── CANON/
│   └── MANIFESTS/
├── 01_LOOKS_EXPENSIVE/
├── 02_MY_THERAPIST_BLOCKED_ME/
├── 03_BAD_DECISIONS_GREAT_OUTFIT/
├── 04_PRETTY_BOY_PROBLEMS/
├── 05_DELETE_AFTER_LISTENING/
├── 06_NO_SIGNAL/
├── 07_2_17_AM/
├── 08_PARALLEL_YOU/
├── 09_ROOM_SERVICE_FOR_ONE/
├── 10_WRONG_FLOOR/
├── 90_CAMPAIGN/
├── 95_RIGHTS_PROVENANCE/
└── 99_QC_RECEIPTS/
```

Each track uses:

```text
NN_TITLE/
├── MASTER/
│   ├── NN_TITLE_ARCHIVE_MASTER_24-48.wav
│   ├── NN_TITLE_MASTER.flac
│   └── NN_TITLE_REFERENCE_320.mp3
├── ALTERNATES/
│   ├── NN_TITLE_INSTRUMENTAL_DERIVED.wav
│   ├── NN_TITLE_VOCAL_DERIVED.wav
│   ├── NN_TITLE_INSTRUMENTAL_PERFORMANCE_MIX.wav
│   ├── NN_TITLE_VOCAL_FORWARD_REVIEW_MIX.wav
│   ├── NN_TITLE_MUSIC_FORWARD_MIX.wav
│   └── NN_TITLE_CLEAN_MIX.wav
├── ART/
│   ├── cover_3000x3000.png
│   ├── vertical_9x16.png
│   └── thumbnail_16x9.png
├── VIDEO/
│   ├── visualizer_master.mp4
│   ├── lyric_video_master.mp4
│   ├── short_hook_01.mp4
│   └── treatment.md
└── METADATA/
    ├── provenance.json
    ├── audio_qc.json
    ├── lyrics.txt
    ├── credits.json
    └── checksums.sha256
```

Missing assets are represented by explicit manifest state, never zero-byte placeholders that could be mistaken for deliverables.

## 7. Asset-state model

All album-package assets use one of the following internal states:

- `VERIFIED_SOURCE`
- `DERIVED_REPAIR_ONLY`
- `CURATED_REFERENCE_MASTER`
- `CANDIDATE`
- `APPROVED_PRODUCTION_ASSET`
- `BLOCKED_SOURCE_MISSING`
- `SUPERSEDED`
- `REJECTED`

`CURATED_REFERENCE_MASTER` is intentionally below `NATIVE_STEM_MASTER`.

## 8. Audio pipeline

### 8.1 Source selection

For each song:

1. enumerate all known source and derivative candidates;
2. compute SHA-256;
3. inspect codec, duration, sample rate, bit depth, channels, peak, true peak where available, loudness, DC offset, and clipping indicators;
4. compare original full mix to cleaned/music-forward candidates;
5. document source-selection rationale;
6. preserve originals unchanged.

### 8.2 Restoration/mastering chain

No global album preset is applied. Each track receives a bounded per-track chain selected from:

- high-pass/subsonic cleanup where justified,
- low-frequency resonance control,
- static/noise repair where measurable and audibly beneficial,
- corrective EQ,
- vocal/music balance correction when separations exist,
- conservative dynamics control,
- stereo/phase sanity correction,
- peak management,
- album-relative loudness placement,
- final dithering only where bit-depth conversion requires it.

Processing must not invent stereo information for mono sources merely to create apparent width. Any stereoization must be an explicit derivative effect and not the archival master.

### 8.3 Master exports

For source-backed tracks:

- `ARCHIVE_MASTER_24-48.wav`: PCM 24-bit / 48 kHz, derived-source provenance embedded in sidecar metadata.
- `MASTER.flac`: bit-perfect FLAC encoding of the archive-master WAV.
- `REFERENCE_320.mp3`: 320 kbps listening/promo reference.

### 8.4 Alternate assets

Use the original documented derived separations when surfaced. Do not silently re-run separation unless the original repair payload remains unavailable and a recovery branch is explicitly invoked.

If recovery separation is necessary, classify all outputs `DERIVED_REPAIR_ONLY_V2` with new hashes, model/version, and no implication that they reproduce the first repair package.

## 9. Audio QC

Each completed source-backed track must pass:

- file decodes successfully;
- expected duration within documented tolerance;
- 48 kHz / 24-bit WAV output verified;
- FLAC decodes and PCM hash matches its WAV source after canonical decode comparison;
- 320 kbps MP3 bitrate verified;
- no accidental truncation;
- no digital full-scale clipping introduced by this mastering pass;
- stereo channel consistency/phase sanity where applicable;
- audible bass reduction and vocal/music integration evaluated against source;
- provenance sidecar present;
- checksum manifest present;
- source limitation statement present.

QC can pass technical integrity while still flagging subjective concerns for human master selection.

## 10. Visual system

### 10.1 Identity continuity anchors

Generated album visuals must preserve:

- black rectangular glasses,
- ear gauges,
- throat/neck eye tattoo,
- extensive arm and hand tattoos,
- slim athletic frame,
- jewelry/chains/watch/grills when contextually appropriate,
- calm/direct/slightly detached expression,
- luxury-meets-street fashion language.

### 10.2 Era rule

Every approved campaign frame contains:

`beautiful surface + one wrong/corrupted detail`

### 10.3 Visual modes

- **Luxury Noir:** LOOKS EXPENSIVE, 2:17 AM, ROOM SERVICE FOR ONE, DELETE AFTER LISTENING
- **Beautiful but Wrong:** WRONG FLOOR, MY THERAPIST BLOCKED ME, NO SIGNAL
- **Flash / Motion / Flex:** BAD DECISIONS GREAT OUTFIT, PRETTY BOY PROBLEMS, PARALLEL YOU

### 10.4 Artwork deliverables

For each track:

- square 3000×3000 master artwork,
- vertical 9:16 campaign adaptation,
- 16:9 video thumbnail,
- provenance record identifying reference assets and generation/edit lineage,
- visual-QA record.

The album cover establishes the era identity. Single covers must look related without being simple recolors.

## 11. Video system

Production follows the existing continuity ladder:

1. still-image identity proof,
2. 5–8 second motion test,
3. flagship visualizer style,
4. lyric-video style,
5. hero vertical film,
6. 2–4 minute narrative/performance video for priority tracks,
7. 6–15 short-form derivatives per major video.

No full narrative video is considered approved if face, tattoo, wardrobe, movement, or lip-sync continuity fails.

### 11.1 Priority video order

Initial priority follows the proof cycle:

1. LOOKS EXPENSIVE
2. MY THERAPIST BLOCKED ME
3. BAD DECISIONS, GREAT OUTFIT

Remaining videos are developed after the audio payload and continuity gates are satisfied.

## 12. Metadata and provenance

Every audio, art, and video deliverable receives a sidecar with, where applicable:

- asset ID,
- filename,
- track ID,
- asset state,
- parent asset(s),
- SHA-256,
- source hash,
- source type,
- derivation method,
- tool/provider/model,
- settings/seed/job ID when available,
- created timestamp,
- sample rate / bit depth / channels / duration for audio,
- dimensions / format for images,
- dimensions / FPS / duration / codec for video,
- rights/provenance status,
- approval status,
- supersedes / superseded-by relationships,
- limitation notice.

## 13. Album manifest

`ALBUM_MANIFEST.json` is the machine-readable source of package completeness. It contains an entry for every required deliverable and one of:

- `present_verified`
- `present_needs_human_approval`
- `blocked_source_missing`
- `not_applicable`

The album is not declared complete while required entries remain `blocked_source_missing`.

## 14. Error handling / fail-closed behavior

- Unknown source lineage → do not promote.
- Hash mismatch → quarantine asset and stop that branch.
- Corrupt media → retry only from verified parent.
- Missing source → mark blocked; do not generate substitute audio unless recovery branch is explicitly authorized.
- Visual identity drift → reject frame; preserve accepted references.
- Rights unknown → asset may remain internal candidate but cannot advance to release-ready.
- Missing human approval → package may reach `COMPLETE_PENDING_HUMAN_APPROVAL`, never `RELEASE_READY`.

## 15. Implementation phases

### Phase A — Foundation

- create package schema;
- ingest Canon/repair metadata;
- establish manifest and provenance schemas;
- create all ten track records;
- mark payload state per track.

### Phase B — Tracks 01–03 audio

- materialize accessible originals and derivatives;
- run source comparison and QC;
- create archive-remaster WAV/FLAC/MP3 outputs;
- create provenance/QC/checksum sidecars;
- preserve source candidates.

### Phase C — Locate repair payload

- continue archive/folder search by exact expected filenames and source hashes;
- recursively inspect newly surfaced containers;
- reconcile against `DERIVED_REPAIR_PACKAGE_METADATA.json`;
- ingest verified original repair assets without re-separating.

### Phase D — Tracks 04–10 audio

Only after payload is surfaced or explicit recovery separation is approved.

### Phase E — Artwork system

- select album-cover candidate family;
- build visual continuity ledger;
- generate/adapt ten single-cover families;
- export square/vertical/thumbnail assets;
- run visual QA.

### Phase F — Video system

- lock flagship visualizer language;
- complete proof-cycle visualizers/lyric videos first;
- create priority hero videos;
- extract short-form derivatives;
- extend to tracks 4–10 after source and identity gates.

### Phase G — Final packaging/QC

- assemble album manifest;
- run media integrity scans;
- regenerate checksums;
- detect duplicates/unexpected files;
- validate naming;
- validate provenance completeness;
- produce release-readiness report and replacement map for future native masters.

## 16. Testing strategy

### Automated

- filesystem schema validator;
- JSON schema validation;
- checksum verification;
- ffprobe media inspection;
- WAV/FLAC PCM equivalence test;
- MP3 bitrate test;
- image-dimension test;
- video codec/FPS/duration test;
- filename and asset-state linting;
- duplicate-content hash detection;
- native/derived terminology lint.

### Human/evaluative

- audio A/B selection;
- bass/noise/vocal-balance review;
- visual identity continuity review;
- final album-cover selection;
- final master selection;
- rights/credits confirmation;
- public-release authorization.

## 17. Acceptance criteria

The implementation is complete only when:

1. all ten track records and expected directories/manifests exist;
2. every actual media file has SHA-256 provenance;
3. no derived asset is labelled native;
4. source-backed tracks have verified 24/48 WAV, FLAC, and 320 MP3 masters;
5. derived alternates are present where source material exists and are correctly labelled;
6. artwork has the required three formats and passes continuity review;
7. required video deliverables decode and meet technical requirements;
8. album-level metadata, lyrics, credits, rights state, and provenance are complete to the available evidence;
9. blocked source gaps are explicit, not hidden;
10. all package checksums verify from a clean read;
11. the future `NATIVE_STEM_MASTER` replacement map is documented;
12. release status remains blocked until all applicable human approvals and rights gates are recorded.

## 18. Completion-state semantics

- `VERIFIED_COMPLETE`: all acceptance criteria and required approvals satisfied.
- `COMPLETE_PENDING_HUMAN_APPROVAL`: technical/package work complete, consequential approval pending.
- `BLOCKED`: required source, right, or approval prevents progress.
- `UNVERIFIED`: evidence cannot establish the claim.

No planned or attempted action may be described as complete.

## 19. Current expected starting state

- Package architecture: ready to implement.
- Tracks 01–03: source-backed implementation can begin immediately.
- Tracks 04–10: metadata-backed but audio payload blocked until located.
- Visual references: sufficient for identity-continuity candidate work.
- Final publication/distribution: not authorized by this design approval.
