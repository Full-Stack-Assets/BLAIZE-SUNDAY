# Autonomous Video Factory v0.2 — HyperFrames Addendum

**Status:** Design amendment for user review  
**Date:** 2026-08-18  
**Repository:** `Full-Stack-Assets/BLAIZE-SUNDAY`  
**Branch:** `agent/video-factory-v0.2-spec`  
**Applies to:** `2026-08-18-autonomous-video-factory-v0.2-design.md`

## 1. New evidence

A second implementation attempt for the same regression topic used a HyperFrames-oriented workflow with:
- one narrative planner;
- one visual planner;
- six separately executed scene compositions;
- `audio_synth`;
- `inline_index_html` assembly;
- `lint_hyperframes` verification;
- a retry scene-executor pass after linting;
- final preview generation.

The execution trace demonstrates that HyperFrames already maps closely to the intended v0.2 architecture: narrative plan -> scene plan -> independent scene composition -> audio -> deterministic composition assembly -> lint/verification -> preview.

The preview URL itself was not reliably retrievable through the current browser fetch path, so this addendum does **not** claim the rendered HyperFrames output is higher quality than the Wisebase artifact. The trace is evidence of workflow capability, not yet visual-quality evidence.

## 2. Architecture amendment

Promote **HyperFrames from optional-later tooling to a first-class deterministic scene-composition backend**.

Revised rendering responsibilities:

```text
SceneManifest
   |
   +--> Manim -------- precise scientific diagrams / equations / deterministic geometry
   |
   +--> Generative video providers -------- cinematic/atmospheric footage
   |
   +--> HyperFrames -------- typography, overlays, compositing, motion graphics,
   |                         captions, scene transitions, mixed media, reusable scene HTML
   |
   +--> FFmpeg -------- final codec-normalized master, mux, derivatives, probe/QC
```

HyperFrames and FFmpeg are therefore complementary rather than alternatives:
- HyperFrames owns high-level deterministic visual composition and motion-graphics timing.
- FFmpeg owns final canonical encode/mux, media normalization, technical derivatives, and machine-verifiable media probing.

## 3. Why this is better for v0.2

The original Wisebase fixture failed primarily because one visual grammar carried the entire explainer. HyperFrames gives the pipeline a richer deterministic middle layer without surrendering final render control to a black-box video generator.

For the cosmic-web fixture, a hybrid scene can combine:
- a generated or telescope-like space background;
- deterministic animated particles/filaments;
- labeled `fluctuations`, `dark matter`, `filaments`, `nodes`, and `voids`;
- subtle camera motion;
- canonical caption overlays;
- smooth cross-scene transitions;
- Manim-rendered scientific diagrams inserted as media clips.

This should improve perceived richness while preserving inspectability and reproducibility.

## 4. Caption amendment

The original specification remains authoritative that `CaptionTimeline.json` is canonical.

HyperFrames may consume the canonical caption timeline for visual subtitle rendering, but it must not generate a competing canonical caption source.

```text
NarrationAudio + Script
      -> AlignmentProvider
      -> CaptionTimeline.json
          |-> SRT
          |-> VTT
          |-> HyperFrames caption track
          |-> optional burned-in master
```

A HyperFrames re-render caused only by visual changes must preserve the caption timeline hash.

## 5. HyperFrames adapter contract

Add a provider-neutral composition interface:

```ts
interface SceneCompositor {
  compose(input: {
    sceneManifest: SceneManifest;
    sceneAssets: MediaAsset[];
    captionTimeline: CaptionTimeline;
    audioAssets: AudioAsset[];
    designSystem: VideoDesignSystem;
  }): Promise<CompositionArtifact>;
}
```

The HyperFrames implementation produces:
- root `index.html` composition;
- one or more reusable scene HTML sub-compositions;
- deterministic GSAP timeline definitions;
- composition metadata;
- lint result;
- preview/render provenance;
- media dependency manifest.

Domain contracts must not expose HyperFrames-specific HTML or GSAP concepts outside the adapter boundary.

## 6. Determinism rules

The HyperFrames adapter must satisfy:
- no unseeded randomness;
- no time-dependent layout logic;
- explicit scene durations from the canonical manifest;
- stable media references and hashes;
- no hidden provider-generated narration or captions;
- all scenes pass HyperFrames lint before render eligibility;
- a lint retry cannot silently change narration, factual claims, or caption timing.

## 7. Visual design system

Because HyperFrames requires an explicit visual identity before composition, add a versioned `VideoDesignSystem` artifact.

For Regression Fixture 001:
- mood: cinematic / technical / elegant;
- canvas: dark space;
- accents: cyan + warm gold;
- typography: clean modern sans-serif, high contrast, restrained labels;
- motion: continuous, precise, subtle depth, no childish bounce or template-like kinetic typography;
- avoid generic blue SaaS gradients, overlong title cards, decorative motion unrelated to narration, and unnecessary talking heads.

The exact palette/font selection becomes a versioned design artifact during implementation rather than being embedded in provider prompts.

## 8. Revised first implementation sequence

1. Shared `ResearchPacket`, `SceneManifest`, `CaptionTimeline`, and `VideoQcReceipt` contracts.
2. Regression Fixture 001 metadata and known-failure assertions.
3. Coverage gate for causal cosmology content.
4. Canonical narration + deterministic caption fixture path.
5. Manim scene adapter for one precise scientific sequence.
6. **HyperFrames compositor adapter and lint gate.**
7. FFmpeg canonical final encode/mux + ffprobe QC.
8. One local/no-paid-provider hybrid render using Manim + HyperFrames.
9. Fal adapter with cost preflight.
10. Vertex/Veo adapter with BYOC connection contract.
11. Optional HeyGen/Higgsfield scene adapters.
12. Regression comparison UI and normalized scorecard.

This sequence intentionally proves the richer deterministic visual layer before spending money on generative-video providers.

## 9. Revised acceptance criteria

In addition to the base v0.2 criteria:
- the same `SceneManifest` can produce a HyperFrames composition without changing narration/caption hashes;
- HyperFrames lint passes before the composition can be promoted beyond `EXPERIMENT`;
- the root composition preserves all scene timing from the canonical manifest;
- a deterministic hybrid render uses at least two visual modalities (for example Manim + HyperFrames-native motion graphics);
- FFmpeg/ffprobe confirms the final encoded master meets duration, resolution, frame-rate, and audio requirements;
- visual-provider swaps do not mutate canonical research, narration, or caption artifacts.

## 10. Decision

The recommended v0.2 stack is now:

```text
Writing/Research: OpenAI + Gemini adapters
Narration/Alignment: ElevenLabs-first + fallback adapters
Precise science visuals: Manim
Rich deterministic composition: HyperFrames
Experimental cinematic generation: Fal model router
Strategic BYOC cinematic generation: Vertex/Veo
Presenter specialization: HeyGen
Reference/high-motion specialization: Higgsfield
Final canonical encode/QC: FFmpeg + ffprobe
```

This remains a provider-neutral architecture. HyperFrames becomes a composition capability, not the control plane or source of truth.
