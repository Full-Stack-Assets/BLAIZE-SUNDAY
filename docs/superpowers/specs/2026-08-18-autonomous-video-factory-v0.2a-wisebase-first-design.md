# Autonomous Video Factory v0.2a — Wisebase-First Advancement

**Status:** APPROVED FOR ADVANCEMENT on 2026-08-18  
**Repository:** `Full-Stack-Assets/BLAIZE-SUNDAY`  
**Design branch:** `agent/video-factory-v0.2-spec`  
**BuildGraph outcome:** `EXTEND_EXISTING`  
**Supersedes for the next implementation slice:** the multi-provider execution sequence in `2026-08-18-autonomous-video-factory-v0.2-design.md`; the provider-neutral contracts remain valid, but Fal, Vertex/Veo, Higgsfield, HeyGen, HyperFrames, and custom Manim generation are deferred.

## 1. Decision

Use **AI Wisebase as the only active video-generation backend for v0.2a** because the second causal-prompt run crossed the current subjective quality bar.

Current quality target:
- fixture: `fixture-002-wisebase-causal`
- Wisebase task ID: `2ba4756ec0e744b3adfacdd208a745ae`
- title: `Why Galaxies Form the Cosmic Web`
- provider status: completed
- provider-reported generation wall time: `60.88 s`
- first LLM stage: `26.72 s`
- first render stage: `34.15 s`
- final provider errors: none
- human review: approved as the current quality target

`fixture-001-wisebase` remains the historical baseline that exposed the structure-first/mechanism-light failure mode.

## 2. v0.2a objective

Do **not** replace the Wisebase visual engine yet. Build the product-quality wrapper around it:

```text
VideoGenerationBrief
  -> controlled prompt compiler
  -> Wisebase generation request
  -> external task/result receipt
  -> immutable versioned VideoRun
  -> caption attachment / alignment gate
  -> technical + content QC
  -> VERIFIED or NEEDS_REVISION
  -> controlled mutation into a child run
```

The wrapper must make a good opaque generator governable without pretending the generator itself is transparent.

## 3. Execution boundary

The ChatGPT `AI_Wisebase` connector currently exposes video creation and status polling in this environment. A standalone Wisebase developer API contract for the deployed Songforge web application is **not verified** in this design pass.

Therefore v0.2a separates:

1. **Domain + persistence + UI**, which are implemented in the repository.
2. **Wisebase execution gateway**, which is an interface accepting externally executed task/result receipts.
3. **ChatGPT connector execution**, which can create/poll Wisebase jobs and then supply the resulting task ID, URL, metrics, and errors to the wrapper.

The web application must never claim direct Wisebase connectivity unless a documented runtime API or equivalent authorized transport is later verified. Until then, UI health is `CONNECTOR_MEDIATED` rather than `CONNECTED_DIRECT`.

## 4. Repository reuse decision

Repository inspection confirms the current monorepo already has:
- `packages/shared` with stable JSON canonicalization and SHA-256 hashing;
- `packages/database` with Prisma/PostgreSQL and existing video/generation records;
- `packages/release` with repository/receipt/governance patterns;
- `apps/web` with Next.js App Router API patterns and an existing pipeline surface.

v0.2a creates **one focused package only**:

```text
packages/video/
  domain + prompt mutation + QC + caption contracts + repository port
```

It extends `packages/database` for durable run/caption records and `apps/web` for API/UI. It does not create separate `media`, `captions`, `orchestrator`, or provider packages in this slice.

## 5. Canonical run model

### VideoGenerationBrief

Required fields:
- `title`
- `topic`
- `audience`
- `tone`
- `targetDurationSeconds`
- `durationTolerancePercent`
- `requiredCoverage[]`
- `visualRequirements[]`
- `captionPolicy`
- `endingPolicy`
- `locale`

The brief is canonicalized and hashed before generation.

### VideoRun

Each run records:
- stable `id`
- `version`
- optional `parentRunId`
- mutation type
- canonical brief JSON + `briefHash`
- exact compiled Wisebase concept/explanation strings + prompt hash
- provider = `WISEBASE`
- connector mode = `CONNECTOR_MEDIATED`
- external task ID
- external status
- video URL
- provider metrics and error object
- technical metadata when inspected
- caption state
- QC state + receipt
- created/completed timestamps

A regeneration never overwrites a prior run. It creates a child version.

## 6. Controlled mutations

Exactly five user-facing mutations ship in v0.2a:

- `REGENERATE`
- `MORE_CINEMATIC`
- `MORE_EXPLANATORY`
- `SHORTER`
- `LONGER`

Mutation rules:
- preserve required factual coverage unless the user explicitly edits the brief;
- preserve audience and locale;
- `MORE_CINEMATIC` may strengthen motion, composition, pacing, visual variety, lighting, and spatial depth but cannot remove explanatory requirements;
- `MORE_EXPLANATORY` strengthens causal sequencing, labels, and mechanism coverage;
- `SHORTER` reduces duration target by 10 seconds with a floor of 30 seconds;
- `LONGER` adds 15 seconds with a v0.2a ceiling of 120 seconds;
- every child run stores the mutation and parent hash.

## 7. Caption persistence

Captions are a hard verification requirement even though Wisebase does not currently expose a caption sidecar through the connector response.

Canonical caption assets:
- `CaptionTimeline JSON`
- `SRT`
- `WebVTT`

Each caption version records:
- run ID
- locale
- source type (`PROVIDER_SIDECAR`, `LOCAL_ALIGNMENT`, `MANUAL_IMPORT`)
- source media hash when available
- caption content hash
- version
- cue count
- start/end timing
- created timestamp

Rules:
- a run with no caption track may be `GENERATED`, never `VERIFIED`;
- visual-only regeneration may reuse a caption track only when narration/audio identity is proven unchanged; Wisebase does not currently expose that proof, so v0.2a defaults to **new captions per new run**;
- malformed, empty, or out-of-range captions fail QC;
- caption exports persist independently of the video URL.

Automatic transcription/alignment is implemented as a pluggable local command adapter. When no local alignment command is configured, the system reports `CAPTIONS_REQUIRED` rather than fabricating captions.

## 8. Duration control

The prompt compiler converts `targetDurationSeconds` into explicit pacing requirements and per-beat budgets where a beat outline is supplied.

QC treats duration as a hard contract:

```text
lower = target * (1 - tolerance/100)
upper = target * (1 + tolerance/100)
```

Outside that range = `FAIL_DURATION`.

The mutation engine may create a new run with a revised duration target; it never edits the measured duration of an existing run.

## 9. Lightweight QC

### Hard automated checks

- task reached completed state;
- final provider error is absent;
- video URL exists;
- decoded duration is inside target tolerance when metadata is available;
- minimum resolution target is satisfied when metadata is available;
- minimum FPS target is satisfied when metadata is available;
- persistent captions exist and parse;
- caption cues remain within media duration;
- factual coverage terms/concepts appear in the final transcript when a transcript is available;
- no unresolved required check is silently treated as PASS.

### Lightweight motion-ending check

If FFmpeg is available, sample/hash frames from the final 10 seconds. A fully repeated terminal sequence is flagged `STATIC_ENDING_RISK`. It is a warning/review gate rather than a scientific motion-quality score.

### Human quality checks

The UI records optional 1–10 ratings for:
- visual coherence;
- explanatory fidelity;
- pacing;
- narration quality;
- overall usefulness.

A beautiful result cannot be marked explanation-complete when required causal coverage fails.

## 10. Run states

```text
PLANNED
AWAITING_EXTERNAL_EXECUTION
PENDING
COMPLETED
GENERATED
CAPTIONS_REQUIRED
QC_FAILED
NEEDS_REVISION
VERIFIED
FAILED
```

Provider completion is not equivalent to product verification.

## 11. UI

Add a new `/video-lab` workspace rather than changing the artist Song Lab.

The surface includes:
- title/topic field;
- audience and tone;
- target duration;
- required coverage editor;
- visual requirements;
- compiled Wisebase brief preview;
- provider state (`CONNECTOR_MEDIATED`);
- run/version history;
- video preview;
- provider metrics;
- caption status/downloads;
- QC receipt;
- buttons for the five controlled mutations.

Because the deployed app cannot yet truthfully invoke Wisebase directly, generation actions create an `AWAITING_EXTERNAL_EXECUTION` run and expose the exact compiled payload. A connector-mediated execution can attach the Wisebase task/result receipt afterward.

## 12. Regression fixtures

Seed two immutable benchmark records:

### fixture-001-wisebase
- task `8008938a45804a02946a31b9c0d9bb62`
- 42.39 s provider wall time
- 34.0 s artifact reported by inspection
- 854x480 @ 15 fps reported by inspection
- known weakness: weak causal mechanism coverage

### fixture-002-wisebase-causal
- task `2ba4756ec0e744b3adfacdd208a745ae`
- 60.88 s provider wall time
- zero provider final error
- exact causal prompt preserved
- human quality state: `CURRENT_TARGET`

Do not invent unmeasured technical metadata for fixture 002.

## 13. Deferred work

Explicitly defer:
- Fal;
- direct Vertex/Veo;
- Higgsfield;
- HeyGen;
- HyperFrames as a required compositor;
- custom Manim replacement rendering;
- direct YouTube publication;
- public release/deployment;
- any claim that Wisebase is directly callable from the deployed app.

These remain future adapters behind the provider-neutral boundary if later evidence justifies them.

## 14. Acceptance criteria

v0.2a is implementation-complete when:
1. a generic video brief can be created without BLAIZE-specific fields;
2. the exact Wisebase execution payload is deterministic and hashable;
3. `fixture-002-wisebase-causal` is persisted as the current quality target;
4. Wisebase task/result receipts can be attached to a versioned run without overwriting history;
5. the five controlled mutations create child runs with preserved provenance;
6. duration QC, provider-error QC, caption-presence QC, transcript coverage QC, and technical metadata QC are implemented fail-closed;
7. SRT/VTT/JSON caption assets are versioned and downloadable once supplied/generated;
8. a generated run cannot become `VERIFIED` without captions and required QC evidence;
9. `/video-lab` exposes runs, versions, mutations, captions, provider metrics, and QC truthfully;
10. tests, typecheck, Prisma validation/generation, formatting, and production web build pass;
11. implementation is delivered on a feature branch/draft PR and is not merged or deployed without separate authorization.
