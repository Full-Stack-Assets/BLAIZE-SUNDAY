# Autonomous Video Factory v0.2 Design

**Status:** Approved direction, written for review before implementation  
**Date:** 2026-08-18  
**Repository:** `Full-Stack-Assets/BLAIZE-SUNDAY`  
**Branch:** `agent/video-factory-v0.2-spec`  
**BuildGraph outcome:** `EXTEND_EXISTING`  
**Scope:** Add a generic, provider-neutral educational-video vertical slice by reusing Songforge workflow infrastructure, Aetheria audio concepts, existing governance, and the repository's deterministic control-plane patterns. Do not turn BLAIZE SUNDAY artist-specific canon into the generic product contract.

## 1. Why this iteration exists

The first Wisebase spike proved the product behavior but not the target quality bar.

Regression fixture:
- Task ID: `8008938a45804a02946a31b9c0d9bb62`
- Topic: `Why galaxies form the cosmic web`
- Provider result: completed with zero final errors
- Reported generation wall time: 42.39 s
- Artifact duration: 34.0 s versus ~60 s target
- Artifact: 854x480 at 15 fps, H.264/AAC
- Visual style: minimalist 2-D Manim schematic
- Primary content failure: explains what the cosmic web looks like more strongly than why it forms

This fixture is retained as `fixture-001-wisebase` for future regression comparison. It is an experimental benchmark, not a production asset.

## 2. v0.2 objective

Prove one transparent, inspectable lifecycle:

```text
topic
  -> research packet
  -> structured scene manifest
  -> narration script
  -> narration audio
  -> canonical caption timeline
  -> per-scene visual assets
  -> deterministic assembly
  -> independent QC receipt
  -> comparison report
```

The same canonical manifest must be renderable through multiple visual strategies without rewriting the narration, captions, factual coverage contract, or final assembly logic.

## 3. Non-goals

v0.2 does not:
- publish to YouTube or any public platform;
- create a new permanent agent hierarchy;
- make paid provider calls without an explicit cost authorization;
- establish one video model as the architecture;
- depend on BLAIZE identity, likeness, voice, or artist canon;
- treat provider-generated subtitles as canonical project state;
- attempt long-form 10+ minute generation;
- require a polished consumer UI beyond a minimal regression surface.

## 4. Repository boundary

The implementation extends the existing monorepo rather than starting a new repository.

Existing reusable surfaces include:
- `packages/shared` for typed contracts and deterministic hashing;
- `packages/agents` for bounded structured generation and provider-neutral reasoning tasks;
- `packages/database` for canonical persisted state and evidence records;
- `packages/release` for approvals, receipts, and governed outward transitions;
- `apps/web` for the minimal regression UI.

v0.2 adds focused packages rather than placing media logic inside artist-specific modules:

```text
packages/
  video/           scene manifest, visual routing, render plans, QC contracts
  captions/        alignment normalization, CaptionTimeline, SRT/VTT export
  media/           provider-neutral video/image/audio asset ports and provenance
```

If implementation review shows an existing package already owns one of these responsibilities cleanly, extend that package instead of creating a duplicate.

## 5. Canonical contracts

### 5.1 ResearchPacket

The research stage returns evidence before prose generation.

Required fields:
- `topic`
- `audience`
- `sources[]`
- `claims[]`
- `uncertainties[]`
- `requiredCoverage[]`
- `forbiddenOrUnsupportedClaims[]`
- provider/model provenance

A claim records source references and evidence state. The narration writer receives this packet rather than silently inventing factual support.

### 5.2 SceneManifest

`SceneManifest` is the single source of truth for the video plan.

Required top-level fields:
- `schemaVersion`
- `projectId`
- `topic`
- `audience`
- `targetDurationSeconds`
- `durationTolerancePercent`
- `resolution`
- `targetFps`
- `visualMode`
- `requiredCoverage[]`
- `scenes[]`
- `qcChecklist[]`

Each scene includes:
- stable `id`
- `durationSeconds`
- `purpose`
- `narration`
- `claims[]`
- `mustCover`
- `visualIntent`
- ordered `visualCandidates[]`
- optional `onScreenText[]`
- transition intent
- asset references
- provider/model provenance after generation

The manifest is JSON-schema/Zod validated before any expensive media-generation step.

### 5.3 CaptionTimeline

Captions are canonical durable assets, not an export-only feature.

```text
NarrationScript
  -> NarrationAudio
  -> Alignment
  -> CaptionTimeline.json
       -> captions.srt
       -> captions.vtt
       -> optional burned-in captions
       -> platform-specific subtitle formats
```

Required invariants:
- caption timing is derived from the canonical narration audio;
- visual regeneration never invalidates captions;
- narration edits require realignment and a new caption version;
- provider subtitle files are evidence/comparison artifacts, not canonical truth;
- every caption artifact has source narration hash, source audio hash, version, locale, and generation/alignment provenance.

## 6. Writing and research adapters

Use provider-neutral ports:

```ts
interface ResearchProvider {
  research(input): Promise<ResearchPacket>
}

interface ScenePlanningProvider {
  createManifest(input): Promise<SceneManifest>
}

interface NarrationProvider {
  writeNarration(input): Promise<NarrationScript>
}
```

Initial implementations:
1. OpenAI structured-output adapter as the primary writer/planner when configured.
2. Gemini structured-output adapter as a second-provider writer/critic when configured.
3. Deterministic fixture adapter for tests.

The coverage critic runs after scene planning and before paid rendering. For `fixture-001-wisebase`, the required causal coverage is:
- primordial density fluctuations;
- dark-matter scaffolding;
- gravitational instability;
- anisotropic collapse into sheets/filaments/nodes;
- void evacuation;
- role of cosmic expansion.

A manifest that fails required coverage cannot progress to expensive video generation.

## 7. Audio adapters

Use a generic audio boundary rather than coupling video generation directly to a TTS vendor.

```ts
interface SpeechProvider {
  synthesize(script, voiceProfile): Promise<AudioAsset>
}

interface AlignmentProvider {
  align(script, audio): Promise<CaptionTimeline>
}

interface MusicProvider {
  compose(plan): Promise<AudioAsset>
}

interface SoundEffectProvider {
  generate(event): Promise<AudioAsset>
}
```

Initial preferred providers:
- ElevenLabs for narration, forced alignment, music, and SFX where configured and authorized;
- Google/Vertex-compatible speech as a BYOC fallback where available;
- deterministic fixture audio for tests.

Audio normalization and final mixing remain deterministic and provider-independent.

## 8. Visual provider router

The visual router chooses by scene capability, not vendor brand.

```text
diagram / graph / equation
  -> Manim

cinematic scientific visualization
  -> generative video provider

persistent presenter
  -> avatar provider

character/reference-consistent shot
  -> reference-aware video provider

still illustration + deterministic motion
  -> image provider + compositor
```

Initial provider set for v0.2:
- `manim` deterministic diagrams;
- `fal` as the broad experimental model router;
- `vertex-veo` as the strategic BYOC direct path;
- `heygen` optional presenter adapter;
- `higgsfield` optional high-motion/reference-consistency adapter.

Only `manim`, `fal`, and `vertex-veo` are required for the first implementation plan. HeyGen and Higgsfield are capability adapters behind the same interface and can be implemented after the regression harness proves useful.

Provider model names are runtime configuration and recorded provenance. They are not embedded in the domain schema.

## 9. Regression matrix

The same canonical narration and caption track is rendered four ways:

1. `MANIM_ONLY`
2. `GENERATIVE_VIDEO`
3. `VERTEX_VEO`
4. `HYBRID`

`HYBRID` uses Manim for precise explanatory scenes and generated video only where motion or atmosphere adds explanatory value.

Every variant consumes the same:
- research packet;
- scene manifest;
- narration audio;
- caption timeline;
- final assembly/QC code.

This isolates visual-provider quality from script, narration, subtitle, and compositor differences.

## 10. Cost governance

Before any paid media call, the system creates a `CostEstimateReceipt` with:
- provider;
- model;
- scene IDs;
- estimated units;
- estimated total cost;
- confidence/limitations;
- requested budget ceiling.

Rules:
- free/local deterministic work can continue autonomously;
- a paid call exceeding the configured zero-cost budget is `BLOCKED_BUDGET` until human authority resolves it;
- retries consume the same project budget and cannot silently reset it;
- provider cost data is recorded separately from estimated cost when the provider exposes actual usage.

## 11. Deterministic assembly

Providers generate assets. They do not own the master timeline.

The compositor receives:
- scene manifest;
- approved/generated scene assets;
- canonical narration audio;
- caption timeline;
- optional music/SFX;
- render settings.

FFmpeg is the default deterministic assembly layer. Manim output is treated as another media asset input. Remotion/HyperFrames can be added later for richer motion graphics, but v0.2 does not require them.

Default technical target for the regression fixture:
- target duration: 55 s;
- tolerance: +/-15%;
- resolution: 1280x720 minimum;
- frame rate: 24 fps minimum;
- H.264/AAC MP4 master;
- SRT + VTT + JSON captions;
- optional burned-in-caption derivative.

## 12. QC receipt

`VideoQcReceipt` is produced by a verifier that does not author the scene plan.

Hard checks:
- final file exists and decodes;
- duration within tolerance;
- resolution and fps meet target;
- required scenes/assets are present;
- captions exist and cover the narration timeline;
- no caption exceeds safe text bounds;
- no silent narration gaps above configured threshold;
- all required factual coverage IDs appear in manifest/script evidence;
- no unresolved failed scene is silently replaced by a success state.

Scored checks:
- visual relevance to narration;
- causal explanatory coverage;
- motion quality;
- continuity/style coherence;
- text legibility;
- narration energy/intelligibility;
- caption synchronization;
- latency;
- estimated and actual cost.

The original Wisebase fixture is scored with the same rubric where measurable.

## 13. Minimal UI

Add a regression workspace, not a full consumer product surface.

Required UI:
- topic input;
- audience selector;
- target duration;
- visual mode;
- provider health;
- cost estimate status;
- workflow timeline;
- manifest viewer;
- caption viewer/download links;
- side-by-side variant results;
- QC scorecard and evidence links.

The UI must distinguish `PLANNED`, `GENERATED`, `VERIFIED`, `BLOCKED_PROVIDER`, `BLOCKED_BUDGET`, and `FAILED`.

## 14. Persistence and provenance

All generated artifacts have:
- stable asset ID;
- SHA-256;
- MIME type;
- size/duration/resolution/fps where applicable;
- source asset IDs;
- scene ID;
- provider/model;
- prompt/input hash;
- created timestamp;
- verification state;
- cost event references.

Originals are immutable. Regeneration creates a new asset version and preserves lineage.

## 15. Failure handling

- Schema failure: stop before provider calls.
- Missing research coverage: return `BLOCKED_COVERAGE`.
- Provider unavailable/unauthorized: return provider-specific blocked state.
- Budget exceeded: `BLOCKED_BUDGET`.
- Individual scene failure: retry only that scene within budget, then preserve failure evidence.
- Caption alignment failure: no final `VERIFIED` state.
- Render/QC failure: preserve artifact as `EXPERIMENT`, do not promote it.

## 16. Testing strategy

### Unit
- SceneManifest schema and duration accounting;
- required-coverage gate;
- visual routing rules;
- caption versioning and export;
- deterministic asset hashing;
- cost-ceiling enforcement;
- QC thresholds.

### Contract
- OpenAI/Gemini structured-output adapters;
- Fal visual adapter;
- Vertex/Veo adapter;
- ElevenLabs narration/alignment adapter;
- provider health normalization.

All external-provider tests have fixture/mocked modes. CI must not spend money.

### Integration
- topic -> research -> manifest -> fixture narration -> caption timeline -> fixture visual assets -> FFmpeg assembly -> QC;
- failed scene retries without regenerating narration/captions;
- narration revision invalidates/recreates captions;
- visual revision does not invalidate captions;
- budget gate prevents paid provider invocation.

### Regression
- `fixture-001-wisebase` benchmark metadata;
- one local deterministic Manim render;
- provider variants only when credentials and explicit paid authorization are available;
- comparison report generated from normalized metrics.

## 17. Acceptance criteria

v0.2 is complete when:
1. one topic can produce a valid, inspectable `ResearchPacket` and `SceneManifest`;
2. the manifest passes a machine-enforced causal-coverage gate before rendering;
3. narration is generated once and produces a durable `CaptionTimeline`;
4. visual regeneration leaves caption hashes unchanged when narration is unchanged;
5. the same manifest can target Manim, Fal, Vertex/Veo, and Hybrid routing contracts;
6. one deterministic no-cost vertical slice renders at >=720p and >=24 fps;
7. final assembly emits MP4 + SRT + VTT + caption JSON;
8. QC detects the original spike's known failure classes: duration miss, insufficient causal coverage, low fps/resolution, and simplistic visual coverage;
9. paid provider calls remain blocked until cost estimate + authority are present;
10. all tests, typecheck, formatting, and production build pass;
11. implementation is delivered on a feature branch/draft PR and is not merged or deployed without separate authorization.

## 18. Implementation sequencing after spec approval

1. contracts and fixture metadata;
2. coverage gate and scene-manifest compiler;
3. caption timeline/versioning;
4. deterministic Manim + FFmpeg vertical slice;
5. QC receipt and regression scorer;
6. Fal adapter with cost preflight;
7. Vertex/Veo adapter and BYOC connection contract;
8. optional HeyGen/Higgsfield adapters;
9. regression UI;
10. full verification and draft PR.

This order deliberately earns quality and governance before paying for cinematic generation.
