# Autonomous Video Factory v0.2a Wisebase-First Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic Wisebase-first video-generation workspace that versions every run, compiles controlled prompt mutations, persists external Wisebase receipts and captions, and fails closed on lightweight QC before a run can become verified.

**Architecture:** `packages/video` owns provider-neutral run contracts, deterministic Wisebase payload compilation, mutation rules, caption parsing/versioning, QC, and a repository/service boundary. PostgreSQL stores immutable run lineage and caption assets; the Next.js app exposes `/video-lab` and API routes. Wisebase execution remains connector-mediated: the app creates an execution payload and later ingests the returned task/result receipt instead of pretending it has a verified direct Wisebase API.

**Tech Stack:** Node.js 24, TypeScript, pnpm workspaces, Next.js 15 App Router, Prisma/PostgreSQL, Node test runner, SHA-256 utilities from `@songforge/shared`, optional FFprobe/FFmpeg command adapters.

**Spec:** `docs/superpowers/specs/2026-08-18-autonomous-video-factory-v0.2a-wisebase-first-design.md`

## Global Constraints

- BuildGraph outcome remains `EXTEND_EXISTING`.
- Wisebase is the only active video-generation backend in v0.2a.
- Provider mode is `CONNECTOR_MEDIATED`; do not claim direct Wisebase API connectivity.
- `fixture-002-wisebase-causal` is the current human-approved quality target.
- A provider-completed run is not automatically `VERIFIED`.
- Captions are mandatory for `VERIFIED`.
- Required factual coverage is preserved by every controlled mutation unless the user edits the source brief.
- No public publication, deployment, paid provider expansion, Fal, Vertex/Veo, Higgsfield, HeyGen, or HyperFrames integration is included.
- Implementation branch: `agent/video-factory-wisebase-v0.2a`.
- Delivery target: draft PR only; do not merge or deploy.

---

## File structure locked by this plan

```text
packages/video/
  package.json
  tsconfig.json
  src/index.ts
  src/domain.ts
  src/domain.test.ts
  src/prompt.ts
  src/prompt.test.ts
  src/captions.ts
  src/captions.test.ts
  src/qc.ts
  src/qc.test.ts
  src/repository.ts
  src/repository.test.ts
  src/prisma-repository.ts
  src/service.ts
  src/service.test.ts
  src/technical-inspection.ts
  src/technical-inspection.test.ts

packages/database/
  prisma/schema.prisma
  src/seed.ts

apps/web/
  app/video-lab/page.tsx
  app/api/video-runs/route.ts
  app/api/video-runs/[id]/route.ts
  app/api/video-runs/[id]/external-task/route.ts
  app/api/video-runs/[id]/result/route.ts
  app/api/video-runs/[id]/mutation/route.ts
  app/api/video-runs/[id]/captions/route.ts
  app/api/video-runs/[id]/qc/route.ts
  components/VideoLab.tsx
  components/VideoRunCard.tsx
  lib/video-service.server.ts
  components/AppShell.tsx

root:
  tsconfig.base.json
  .github/workflows/ci.yml
```

`packages/video` is the only new package. Caption/media/orchestration concerns stay inside it until a second consumer proves a separate package is justified.

---

### Task 1: Create video domain contracts and deterministic Wisebase prompt compiler

**Files:**
- Create: `packages/video/package.json`
- Create: `packages/video/tsconfig.json`
- Create: `packages/video/src/index.ts`
- Create: `packages/video/src/domain.ts`
- Create: `packages/video/src/domain.test.ts`
- Create: `packages/video/src/prompt.ts`
- Create: `packages/video/src/prompt.test.ts`
- Modify: `tsconfig.base.json`

**Interfaces:**
- Consumes: `hashPayload(value)` from `@songforge/shared`.
- Produces: `VideoGenerationBrief`, `VideoMutation`, `VideoRunStatus`, `WisebaseExecutionPayload`, `compileWisebasePayload()`, `mutateVideoBrief()`.

- [ ] **Step 1: Write package metadata and path alias**

`packages/video/package.json`:

```json
{
  "name": "@songforge/video",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "node --test src/*.test.ts"
  },
  "dependencies": {
    "@songforge/database": "workspace:*",
    "@songforge/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.2"
  }
}
```

`packages/video/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Add to `tsconfig.base.json` paths:

```json
"@songforge/video": ["packages/video/src/index.ts"]
```

- [ ] **Step 2: Write failing domain tests**

`packages/video/src/domain.test.ts` must assert the stable defaults:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createVideoBrief } from "./domain.ts";

test("creates a generic 60 second video brief with fail-closed caption policy", () => {
  const brief = createVideoBrief({
    title: "Why Galaxies Form the Cosmic Web",
    topic: "Why galaxies form the cosmic web",
    audience: "curious adults",
    tone: "clear, cinematic, scientifically accurate",
    requiredCoverage: ["dark matter", "filaments", "voids"],
    visualRequirements: ["dark space", "cyan/gold accents"]
  });

  assert.equal(brief.targetDurationSeconds, 60);
  assert.equal(brief.durationTolerancePercent, 15);
  assert.equal(brief.captionPolicy, "REQUIRED");
  assert.equal(brief.locale, "en");
});
```

Run:

```bash
pnpm --filter @songforge/video test
```

Expected: FAIL because `domain.ts` does not exist.

- [ ] **Step 3: Implement the domain types and factory**

`packages/video/src/domain.ts`:

```ts
export type CaptionPolicy = "REQUIRED";
export type VideoMutation =
  | "ROOT"
  | "REGENERATE"
  | "MORE_CINEMATIC"
  | "MORE_EXPLANATORY"
  | "SHORTER"
  | "LONGER";

export type VideoRunStatus =
  | "PLANNED"
  | "AWAITING_EXTERNAL_EXECUTION"
  | "PENDING"
  | "COMPLETED"
  | "GENERATED"
  | "CAPTIONS_REQUIRED"
  | "QC_FAILED"
  | "NEEDS_REVISION"
  | "VERIFIED"
  | "FAILED";

export interface VideoGenerationBrief {
  title: string;
  topic: string;
  audience: string;
  tone: string;
  targetDurationSeconds: number;
  durationTolerancePercent: number;
  requiredCoverage: string[];
  visualRequirements: string[];
  captionPolicy: CaptionPolicy;
  endingPolicy: "NO_LONG_STATIC_ENDING";
  locale: string;
}

export function createVideoBrief(input: Omit<VideoGenerationBrief,
  "targetDurationSeconds" | "durationTolerancePercent" | "captionPolicy" | "endingPolicy" | "locale"
> & Partial<Pick<VideoGenerationBrief,
  "targetDurationSeconds" | "durationTolerancePercent" | "locale"
>>): VideoGenerationBrief {
  return {
    ...input,
    targetDurationSeconds: input.targetDurationSeconds ?? 60,
    durationTolerancePercent: input.durationTolerancePercent ?? 15,
    captionPolicy: "REQUIRED",
    endingPolicy: "NO_LONG_STATIC_ENDING",
    locale: input.locale ?? "en"
  };
}
```

- [ ] **Step 4: Write failing prompt/mutation tests**

`packages/video/src/prompt.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { createVideoBrief } from "./domain.ts";
import { compileWisebasePayload, mutateVideoBrief } from "./prompt.ts";

const base = createVideoBrief({
  title: "Why Galaxies Form the Cosmic Web",
  topic: "Why galaxies form the cosmic web",
  audience: "curious adults",
  tone: "clear, cinematic, scientifically accurate",
  targetDurationSeconds: 60,
  requiredCoverage: ["primordial density fluctuations", "dark matter", "filaments", "nodes", "voids"],
  visualRequirements: ["dark space", "cyan/gold accents"]
});

test("Wisebase payload is deterministic", () => {
  assert.deepEqual(compileWisebasePayload(base), compileWisebasePayload(base));
});

test("more cinematic preserves required coverage", () => {
  const next = mutateVideoBrief(base, "MORE_CINEMATIC");
  assert.deepEqual(next.requiredCoverage, base.requiredCoverage);
  assert.ok(next.visualRequirements.some(value => value.includes("continuous motion")));
});

test("shorter and longer obey v0.2a bounds", () => {
  assert.equal(mutateVideoBrief(base, "SHORTER").targetDurationSeconds, 50);
  assert.equal(mutateVideoBrief(base, "LONGER").targetDurationSeconds, 75);
  assert.equal(mutateVideoBrief({ ...base, targetDurationSeconds: 30 }, "SHORTER").targetDurationSeconds, 30);
  assert.equal(mutateVideoBrief({ ...base, targetDurationSeconds: 115 }, "LONGER").targetDurationSeconds, 120);
});
```

- [ ] **Step 5: Implement exact mutation rules and Wisebase payload compilation**

`packages/video/src/prompt.ts`:

```ts
import { hashPayload } from "@songforge/shared";
import type { VideoGenerationBrief, VideoMutation } from "./domain.ts";

export interface WisebaseExecutionPayload {
  concept: string;
  explanation: string;
  lang: string;
  promptHash: string;
}

export function mutateVideoBrief(
  brief: VideoGenerationBrief,
  mutation: VideoMutation
): VideoGenerationBrief {
  if (mutation === "ROOT" || mutation === "REGENERATE") return structuredClone(brief);
  if (mutation === "SHORTER") {
    return { ...brief, targetDurationSeconds: Math.max(30, brief.targetDurationSeconds - 10) };
  }
  if (mutation === "LONGER") {
    return { ...brief, targetDurationSeconds: Math.min(120, brief.targetDurationSeconds + 15) };
  }
  if (mutation === "MORE_CINEMATIC") {
    return {
      ...brief,
      visualRequirements: [...brief.visualRequirements,
        "continuous motion, stronger spatial depth, cinematic composition, varied shot scale, no long static ending"]
    };
  }
  return {
    ...brief,
    requiredCoverage: [...brief.requiredCoverage],
    visualRequirements: [...brief.visualRequirements,
      "make each causal mechanism visually explicit before advancing to the next beat"]
  };
}

export function compileWisebasePayload(brief: VideoGenerationBrief): WisebaseExecutionPayload {
  const concept = brief.title;
  const explanation = [
    `For ${brief.audience}, create a ${brief.tone} educational explainer lasting about ${brief.targetDurationSeconds} seconds on: ${brief.topic}.`,
    `It must explicitly cover ${brief.requiredCoverage.join(", ")}; use ${brief.visualRequirements.join(", ")}; captions must remain available as a persistent sidecar in the product wrapper and the ending must keep meaningful motion rather than becoming a long static card.`
  ].join(" ");
  return {
    concept,
    explanation,
    lang: brief.locale,
    promptHash: hashPayload({ concept, explanation, lang: brief.locale })
  };
}
```

- [ ] **Step 6: Export the public package API and verify**

`packages/video/src/index.ts`:

```ts
export * from "./domain.ts";
export * from "./prompt.ts";
```

Run:

```bash
pnpm --filter @songforge/video test
pnpm --filter @songforge/video typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/video tsconfig.base.json
git commit -m "feat(video): add Wisebase brief and mutation contracts"
```

---

### Task 2: Persist immutable video run lineage, captions, and regression fixtures

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Modify: `packages/database/src/seed.ts`
- Create: `packages/video/src/repository.ts`
- Create: `packages/video/src/repository.test.ts`
- Create: `packages/video/src/prisma-repository.ts`
- Modify: `packages/video/src/index.ts`

**Interfaces:**
- Consumes: domain types from Task 1.
- Produces: `VideoRunRepository`, `InMemoryVideoRunRepository`, `PrismaVideoRunRepository`.

- [ ] **Step 1: Add Prisma enums and models**

Append to `packages/database/prisma/schema.prisma`:

```prisma
enum VideoGenerationRunStatus {
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
}

enum VideoGenerationMutation {
  ROOT
  REGENERATE
  MORE_CINEMATIC
  MORE_EXPLANATORY
  SHORTER
  LONGER
}

enum VideoCaptionSource {
  PROVIDER_SIDECAR
  LOCAL_ALIGNMENT
  MANUAL_IMPORT
}

model VideoGenerationRun {
  id                       String                   @id @default(uuid())
  lineageKey               String
  version                  Int
  parentRunId              String?
  title                    String
  topic                    String
  provider                 String                   @default("WISEBASE")
  connectorMode            String                   @default("CONNECTOR_MEDIATED")
  mutation                 VideoGenerationMutation @default(ROOT)
  brief                    Json
  briefHash                String
  compiledConcept          String
  compiledExplanation      String
  promptHash               String
  targetDurationSeconds    Int
  durationTolerancePercent Float                    @default(15)
  status                   VideoGenerationRunStatus @default(PLANNED)
  externalTaskId           String?                  @unique
  externalStatus           String?
  videoUrl                 String?
  providerMetrics          Json?
  providerError            Json?
  durationSeconds          Float?
  width                    Int?
  height                   Int?
  fps                      Float?
  captionStatus            String                   @default("MISSING")
  qc                       Json?
  createdAt                DateTime                 @default(now())
  completedAt              DateTime?

  parent   VideoGenerationRun?  @relation("VideoRunLineage", fields: [parentRunId], references: [id], onDelete: SetNull)
  children VideoGenerationRun[] @relation("VideoRunLineage")
  captions VideoCaptionAsset[]

  @@unique([lineageKey, version])
  @@index([createdAt])
  @@index([status])
}

model VideoCaptionAsset {
  id              String             @id @default(uuid())
  runId           String
  version         Int
  locale          String
  source          VideoCaptionSource
  format          String
  content         String             @db.Text
  contentHash     String
  cueCount        Int
  startSeconds    Float
  endSeconds      Float
  sourceMediaHash String?
  createdAt       DateTime           @default(now())

  run VideoGenerationRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@unique([runId, version, format])
  @@index([runId, createdAt])
}
```

- [ ] **Step 2: Write repository contract tests first**

`packages/video/src/repository.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryVideoRunRepository } from "./repository.ts";

const root = {
  id: "run-1",
  lineageKey: "lineage-1",
  version: 1,
  parentRunId: null,
  title: "Test",
  topic: "Test topic",
  provider: "WISEBASE" as const,
  connectorMode: "CONNECTOR_MEDIATED" as const,
  mutation: "ROOT" as const,
  brief: {},
  briefHash: "brief",
  compiledConcept: "Test",
  compiledExplanation: "Explain Test",
  promptHash: "prompt",
  targetDurationSeconds: 60,
  durationTolerancePercent: 15,
  status: "AWAITING_EXTERNAL_EXECUTION" as const,
  externalTaskId: null,
  externalStatus: null,
  videoUrl: null,
  providerMetrics: null,
  providerError: null,
  durationSeconds: null,
  width: null,
  height: null,
  fps: null,
  captionStatus: "MISSING",
  qc: null,
  completedAt: null
};

test("repository preserves an immutable root and child version", async () => {
  const repo = new InMemoryVideoRunRepository();
  await repo.create(root);
  await repo.create({ ...root, id: "run-2", version: 2, parentRunId: "run-1", mutation: "MORE_EXPLANATORY" });
  assert.equal((await repo.get("run-1"))?.version, 1);
  assert.equal((await repo.listLineage("lineage-1")).length, 2);
});
```

Run and expect module failures.

- [ ] **Step 3: Implement the repository port and in-memory adapter**

`packages/video/src/repository.ts` defines explicit `VideoRunRecord` / `CaptionRecord` types plus:

```ts
export interface VideoRunRepository {
  create(run: VideoRunRecord): Promise<VideoRunRecord>;
  get(id: string): Promise<VideoRunRecord | null>;
  list(limit?: number): Promise<VideoRunRecord[]>;
  listLineage(lineageKey: string): Promise<VideoRunRecord[]>;
  updateExecution(id: string, patch: ExecutionPatch): Promise<VideoRunRecord>;
  attachCaption(caption: CaptionRecord): Promise<CaptionRecord>;
  listCaptions(runId: string): Promise<CaptionRecord[]>;
  saveQc(id: string, status: VideoRunStatus, qc: unknown): Promise<VideoRunRecord>;
}
```

The in-memory implementation must throw `VIDEO_RUN_NOT_FOUND` for unknown IDs and must not expose any API that mutates `brief`, `briefHash`, `promptHash`, `lineageKey`, or `version` after create.

- [ ] **Step 4: Implement Prisma repository mapping**

`packages/video/src/prisma-repository.ts` uses `prisma.videoGenerationRun` and `prisma.videoCaptionAsset`; normalize Prisma JSON to the repository record shape and use `update()` only for execution/result/QC fields.

- [ ] **Step 5: Seed both Wisebase regression fixtures**

In `packages/database/src/seed.ts`, after agent seeding, upsert stable IDs:

```ts
await prisma.videoGenerationRun.upsert({
  where: { id: "fixture-001-wisebase" },
  update: {},
  create: {
    id: "fixture-001-wisebase",
    lineageKey: "fixture-001-wisebase",
    version: 1,
    title: "Why Galaxies Form the Cosmic Web",
    topic: "Why galaxies form the cosmic web",
    mutation: "ROOT",
    brief: { benchmark: true, knownWeakness: "structure-first/mechanism-light" },
    briefHash: "historical-fixture-001",
    compiledConcept: "Why galaxies form the cosmic web",
    compiledExplanation: "Historical first Wisebase spike",
    promptHash: "historical-fixture-001",
    targetDurationSeconds: 60,
    status: "GENERATED",
    externalTaskId: "8008938a45804a02946a31b9c0d9bb62",
    externalStatus: "completed",
    providerMetrics: { totalDuration: 42.39 },
    durationSeconds: 34,
    width: 854,
    height: 480,
    fps: 15,
    captionStatus: "MISSING"
  }
});
```

Seed fixture 002 with only measured facts:

```ts
await prisma.videoGenerationRun.upsert({
  where: { id: "fixture-002-wisebase-causal" },
  update: {},
  create: {
    id: "fixture-002-wisebase-causal",
    lineageKey: "fixture-002-wisebase-causal",
    version: 1,
    title: "Why Galaxies Form the Cosmic Web",
    topic: "Why galaxies form the cosmic web",
    mutation: "ROOT",
    brief: { benchmark: true, humanQualityState: "CURRENT_TARGET" },
    briefHash: "fixture-002-causal",
    compiledConcept: "Why Galaxies Form the Cosmic Web",
    compiledExplanation: "Causal prompt preserving primordial fluctuations, gravity, dark matter, anisotropic collapse, filaments, nodes and voids.",
    promptHash: "fixture-002-causal",
    targetDurationSeconds: 60,
    status: "CAPTIONS_REQUIRED",
    externalTaskId: "2ba4756ec0e744b3adfacdd208a745ae",
    externalStatus: "completed",
    videoUrl: "https://sider-pub.s3.amazonaws.com/manim/manim-6d0048a69e8a46bda9b389d9b15ef6e1.mp4",
    providerMetrics: { firstLlmDuration: 26.72, firstRenderDuration: 34.15, totalDuration: 60.88 },
    providerError: { firstRenderError: null, secondRenderError: null, finalError: null },
    captionStatus: "MISSING"
  }
});
```

Do not seed an artifact duration/resolution/FPS for fixture 002 unless separately measured.

- [ ] **Step 6: Validate schema and tests**

```bash
pnpm db:validate
pnpm db:generate
pnpm --filter @songforge/video test
pnpm --filter @songforge/video typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/database packages/video
git commit -m "feat(video): persist Wisebase run lineage and fixtures"
```

---

### Task 3: Implement the connector-mediated run lifecycle and controlled child runs

**Files:**
- Create: `packages/video/src/service.ts`
- Create: `packages/video/src/service.test.ts`
- Modify: `packages/video/src/index.ts`

**Interfaces:**
- Consumes: `VideoRunRepository`, `createVideoBrief`, `compileWisebasePayload`, `mutateVideoBrief`, `hashPayload`.
- Produces: `VideoRunService.createRoot()`, `attachExternalTask()`, `recordExternalResult()`, `createMutation()`.

- [ ] **Step 1: Write lifecycle tests**

Tests must prove:

```ts
await service.createRoot(input)
// => status AWAITING_EXTERNAL_EXECUTION, provider WISEBASE, connectorMode CONNECTOR_MEDIATED

await service.attachExternalTask(run.id, "task-123")
// => status PENDING, externalTaskId task-123

await service.recordExternalResult(run.id, {
  status: "completed",
  videoUrl: "https://example.test/video.mp4",
  metrics: { total_duration: 60 },
  error: { final_error: null }
})
// => status CAPTIONS_REQUIRED, never VERIFIED
```

Also assert a failed result becomes `FAILED`, and `createMutation(parentId, "MORE_EXPLANATORY")` creates version +1 with the same lineage key and parent ID.

- [ ] **Step 2: Implement root creation**

Use `randomUUID()` and deterministic hashes:

```ts
const id = randomUUID();
const lineageKey = randomUUID();
const brief = createVideoBrief(input);
const payload = compileWisebasePayload(brief);
return repo.create({
  id,
  lineageKey,
  version: 1,
  parentRunId: null,
  provider: "WISEBASE",
  connectorMode: "CONNECTOR_MEDIATED",
  mutation: "ROOT",
  brief,
  briefHash: hashPayload(brief),
  compiledConcept: payload.concept,
  compiledExplanation: payload.explanation,
  promptHash: payload.promptHash,
  targetDurationSeconds: brief.targetDurationSeconds,
  durationTolerancePercent: brief.durationTolerancePercent,
  status: "AWAITING_EXTERNAL_EXECUTION",
  ...emptyExecutionFields
});
```

- [ ] **Step 3: Implement result state mapping**

Rules:
- external `pending`/`processing` => `PENDING`;
- external `completed` + video URL + no final error => `CAPTIONS_REQUIRED`;
- completed without video URL => `FAILED`;
- any final error => `FAILED`;
- never infer `VERIFIED` from provider completion.

- [ ] **Step 4: Implement child mutations**

Load parent, derive its canonical brief, call `mutateVideoBrief`, increment version, preserve `lineageKey`, set `parentRunId`, recompute all hashes, and create `AWAITING_EXTERNAL_EXECUTION` child record.

- [ ] **Step 5: Verify and commit**

```bash
pnpm --filter @songforge/video test
pnpm --filter @songforge/video typecheck
git add packages/video
git commit -m "feat(video): add connector-mediated Wisebase run lifecycle"
```

---

### Task 4: Implement persistent caption parsing, versioning, and fail-closed caption gate

**Files:**
- Create: `packages/video/src/captions.ts`
- Create: `packages/video/src/captions.test.ts`
- Modify: `packages/video/src/service.ts`
- Modify: `packages/video/src/service.test.ts`
- Modify: `packages/video/src/index.ts`

**Interfaces:**
- Produces: `parseSrt()`, `parseVtt()`, `normalizeCaptionTimeline()`, `toSrt()`, `toVtt()`, `VideoRunService.attachCaptions()`.

- [ ] **Step 1: Write parsing/export tests**

Use this fixture:

```ts
const srt = `1\n00:00:00,000 --> 00:00:02,000\nThe universe is not random.\n\n2\n00:00:02,000 --> 00:00:05,500\nOn the largest scales, it forms a web.\n`;
```

Assert two ordered cues, start `0`, end `5.5`, stable re-export, and rejection of negative/reversed/overlapping impossible cue timing.

- [ ] **Step 2: Implement one canonical caption timeline**

```ts
export interface CaptionCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface CaptionTimeline {
  locale: string;
  cues: CaptionCue[];
}
```

Normalize whitespace, require non-empty cue text, sort by start, reject `end <= start`, and reject a cue whose start is before the previous cue's start.

- [ ] **Step 3: Attach captions as three persisted formats**

`VideoRunService.attachCaptions(runId, { source, locale, srt | vtt | timeline, sourceMediaHash })` must normalize once, compute the next caption version, and persist:
- `json` using `JSON.stringify(timeline)`;
- `srt` using `toSrt(timeline)`;
- `vtt` using `toVtt(timeline)`.

Set run caption status to `AVAILABLE`, but do not change the run to verified.

- [ ] **Step 4: Add optional local alignment contract without pretending it is configured**

Add:

```ts
export interface LocalAlignmentProvider {
  health(): Promise<"CONFIGURED" | "UNCONFIGURED">;
  align(input: { mediaPath: string; locale: string }): Promise<CaptionTimeline>;
}
```

Do not shell out in the default implementation. Export `UnconfiguredLocalAlignmentProvider` whose `health()` returns `UNCONFIGURED` and whose `align()` throws `LOCAL_ALIGNMENT_UNCONFIGURED`.

This satisfies the pluggable boundary while keeping v0.2a truthful; a real Whisper/other local command adapter is a later bounded task once its runtime is selected.

- [ ] **Step 5: Verify and commit**

```bash
pnpm --filter @songforge/video test
pnpm --filter @songforge/video typecheck
git add packages/video
git commit -m "feat(video): add durable caption timeline and exports"
```

---

### Task 5: Implement technical inspection and lightweight QC receipts

**Files:**
- Create: `packages/video/src/technical-inspection.ts`
- Create: `packages/video/src/technical-inspection.test.ts`
- Create: `packages/video/src/qc.ts`
- Create: `packages/video/src/qc.test.ts`
- Modify: `packages/video/src/service.ts`
- Modify: `packages/video/src/index.ts`

**Interfaces:**
- Produces: `TechnicalInspector`, `FfprobeInspector`, `evaluateVideoQc()`, `VideoRunService.runQc()`.

- [ ] **Step 1: Create an injectable FFprobe adapter**

```ts
export interface VideoTechnicalMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
}

export interface TechnicalInspector {
  inspect(input: string): Promise<VideoTechnicalMetadata>;
}
```

`FfprobeInspector` receives an injected `execFile` function for tests and invokes:

```ts
["-v", "error", "-print_format", "json", "-show_streams", "-show_format", input]
```

Parse the first video stream, `format.duration`, width/height, and rational frame rate such as `24/1`. Throw `TECHNICAL_METADATA_UNAVAILABLE` when required values are absent.

- [ ] **Step 2: Write QC tests for the known fixture-001 failures**

Assert that metadata `{ durationSeconds: 34, width: 854, height: 480, fps: 15 }` against target `60`, tolerance `15`, minimum 1280x720, 24fps produces failures:

```text
FAIL_DURATION
FAIL_RESOLUTION
FAIL_FPS
FAIL_CAPTIONS
```

- [ ] **Step 3: Implement fail-closed QC**

`evaluateVideoQc()` accepts run, captions, optional transcript, technical metadata, and optional static-ending observation.

Hard rules:

```ts
const lower = target * (1 - tolerance / 100);
const upper = target * (1 + tolerance / 100);
if (duration < lower || duration > upper) failures.push("FAIL_DURATION");
if (width < 1280 || height < 720) failures.push("FAIL_RESOLUTION");
if (fps < 24) failures.push("FAIL_FPS");
if (!captions.length) failures.push("FAIL_CAPTIONS");
if (providerFinalError) failures.push("FAIL_PROVIDER_ERROR");
```

If a transcript is present, lowercase it and require every normalized `requiredCoverage` phrase or its configured alias to be present. Missing items produce `FAIL_COVERAGE:<item>`. If no transcript exists, add unresolved check `UNKNOWN_COVERAGE` and do not allow verification.

A static-ending signal adds warning `STATIC_ENDING_RISK`; it does not alone fail the run.

`verified = failures.length === 0 && unresolved.length === 0`.

- [ ] **Step 4: Persist QC through the service**

`runQc()` stores technical fields, the full receipt, and sets:
- `VERIFIED` when verified;
- `QC_FAILED` when hard failures exist;
- `NEEDS_REVISION` when only unresolved checks remain.

- [ ] **Step 5: Verify and commit**

```bash
pnpm --filter @songforge/video test
pnpm --filter @songforge/video typecheck
git add packages/video
git commit -m "feat(video): add fail-closed technical and content QC"
```

---

### Task 6: Expose video-run APIs without pretending the web app can invoke Wisebase directly

**Files:**
- Create: `apps/web/lib/video-service.server.ts`
- Create: `apps/web/app/api/video-runs/route.ts`
- Create: `apps/web/app/api/video-runs/[id]/route.ts`
- Create: `apps/web/app/api/video-runs/[id]/external-task/route.ts`
- Create: `apps/web/app/api/video-runs/[id]/result/route.ts`
- Create: `apps/web/app/api/video-runs/[id]/mutation/route.ts`
- Create: `apps/web/app/api/video-runs/[id]/captions/route.ts`
- Create: `apps/web/app/api/video-runs/[id]/qc/route.ts`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: `PrismaVideoRunRepository`, `VideoRunService`.
- Produces: REST-like JSON routes for the `/video-lab` UI and connector-mediated receipt ingestion.

- [ ] **Step 1: Add `@songforge/video` to the web app dependencies**

```json
"@songforge/video": "workspace:*"
```

- [ ] **Step 2: Create one server service singleton**

`apps/web/lib/video-service.server.ts`:

```ts
import { PrismaVideoRunRepository, VideoRunService } from "@songforge/video";

export const videoRunService = new VideoRunService(new PrismaVideoRunRepository());
```

- [ ] **Step 3: Implement root create/list route**

`POST /api/video-runs` accepts only user-editable brief fields. It returns:

```json
{
  "ok": true,
  "run": { "status": "AWAITING_EXTERNAL_EXECUTION" },
  "execution": {
    "provider": "WISEBASE",
    "mode": "CONNECTOR_MEDIATED",
    "concept": "...",
    "explanation": "...",
    "lang": "en"
  }
}
```

It must not call Sider/Wisebase over arbitrary HTTP.

`GET /api/video-runs` returns newest runs.

- [ ] **Step 4: Implement task/result receipt routes**

`POST /api/video-runs/:id/external-task` body:

```json
{ "externalTaskId": "2ba..." }
```

`POST /api/video-runs/:id/result` body:

```json
{
  "externalStatus": "completed",
  "videoUrl": "https://...mp4",
  "metrics": { "totalDuration": 60.88 },
  "error": { "finalError": null }
}
```

Both use `readJsonObject()`, `requiredString()`, and `apiError()` patterns already present in `apps/web/lib/api.ts`.

- [ ] **Step 5: Implement mutation route**

`POST /api/video-runs/:id/mutation` accepts only one of the five allowed mutation values and returns the child run + its Wisebase execution payload.

- [ ] **Step 6: Implement captions route**

`POST /api/video-runs/:id/captions` accepts:

```json
{ "source": "MANUAL_IMPORT", "locale": "en", "format": "srt", "content": "..." }
```

`GET` returns all caption assets ordered by version/format.

- [ ] **Step 7: Implement QC route**

`POST /api/video-runs/:id/qc` accepts optional transcript and optional supplied technical metadata. If technical metadata is absent and FFprobe inspection fails, preserve `TECHNICAL_METADATA_UNAVAILABLE` as unresolved instead of manufacturing values.

- [ ] **Step 8: Extend API error mapping**

Add 404/400/409 mappings for:

```text
VIDEO_RUN_NOT_FOUND
INVALID_VIDEO_MUTATION
EXTERNAL_TASK_ID_REQUIRED
INVALID_CAPTION_FORMAT
CAPTIONS_REQUIRED
TECHNICAL_METADATA_UNAVAILABLE
```

- [ ] **Step 9: Verify**

```bash
pnpm --filter @songforge/web typecheck
pnpm --filter @songforge/web build
```

- [ ] **Step 10: Commit**

```bash
git add apps/web packages/video
git commit -m "feat(video): expose connector-mediated Wisebase run APIs"
```

---

### Task 7: Build the `/video-lab` run/version/QC interface

**Files:**
- Create: `apps/web/app/video-lab/page.tsx`
- Create: `apps/web/components/VideoLab.tsx`
- Create: `apps/web/components/VideoRunCard.tsx`
- Modify: `apps/web/components/AppShell.tsx`

**Interfaces:**
- Consumes: `/api/video-runs` routes from Task 6.
- Produces: human-visible source brief, exact execution payload, lineage, video preview, caption state, QC, and five mutation controls.

- [ ] **Step 1: Add navigation entry**

In `AppShell.tsx`, import `Video` from `lucide-react` and add:

```ts
{ href: "/video-lab", label: "Video", icon: Video }
```

Do not replace the existing Song Lab.

- [ ] **Step 2: Implement the create form**

The form defaults:
- audience: `curious adults`;
- tone: `clear, cinematic, scientifically accurate`;
- target: `60`;
- tolerance: `15`;
- locale: `en`.

Required coverage and visual requirements use newline-separated textareas converted to arrays.

- [ ] **Step 3: Display the execution boundary clearly**

When a run is `AWAITING_EXTERNAL_EXECUTION`, show:

```text
Wisebase · connector-mediated
This build has prepared the exact generation payload. It has not directly called Wisebase.
```

Show `concept`, `explanation`, `lang`, and `promptHash` in a copyable block.

- [ ] **Step 4: Implement run cards**

Each card displays:
- version and mutation;
- status;
- target duration;
- external task ID;
- video preview when URL exists;
- provider metrics;
- captions available/missing;
- QC failures/unresolved/warnings;
- measured duration/resolution/FPS only when present.

Never display unknown values as zero.

- [ ] **Step 5: Add controlled mutation buttons**

Exactly:

```text
Regenerate
More cinematic
More explanatory
Shorter
Longer
```

Each button calls the mutation endpoint and selects the returned child run. No free-form mutation command is added in v0.2a.

- [ ] **Step 6: Add caption import + download**

Allow paste/import of SRT or VTT text and show links/buttons that download the persisted SRT, VTT, and JSON representations from the API response. Do not expose a fake automatic-caption button when local alignment is unconfigured.

- [ ] **Step 7: Add QC panel**

Render separate sections:

```text
Hard failures
Unresolved checks
Warnings
Human ratings
```

Human ratings are local UI inputs unless/until a persistence field is added; do not let ratings override hard failures.

- [ ] **Step 8: Verify responsive build**

```bash
pnpm --filter @songforge/web typecheck
pnpm --filter @songforge/web build
```

Manually verify `/video-lab` at narrow mobile width and desktop width.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(video): add Wisebase-first video lab"
```

---

### Task 8: Add regression coverage, tighten CI truthfulness, and prepare a draft PR

**Files:**
- Create: `packages/video/src/regression.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/superpowers/specs/2026-08-18-autonomous-video-factory-v0.2a-wisebase-first-design.md` only if implementation evidence requires a factual correction

**Interfaces:**
- Produces: evidence that fixture 001 fails known technical gates and fixture 002 remains the quality target without invented metadata.

- [ ] **Step 1: Add regression tests**

`regression.test.ts` must assert:
- fixture 001's measured 34s/854x480/15fps fails duration/resolution/FPS gates;
- fixture 001 cannot verify without captions;
- fixture 002 fixture data does not contain invented artifact duration/resolution/FPS;
- provider `completed` never implies verified;
- a valid 60s/1280x720/24fps run with captions and coverage can verify;
- all five mutations preserve the parent run unchanged.

- [ ] **Step 2: Make CI fail on tests/typecheck**

In `.github/workflows/ci.yml`, remove `continue-on-error: true` from Typecheck and Test. Add Prisma validation before build:

```yaml
- name: Prisma validate
  run: pnpm db:validate

- name: Prisma generate
  run: pnpm db:generate
```

Do not add provider calls to CI.

- [ ] **Step 3: Run the complete local verification matrix**

```bash
pnpm install --no-frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm test
pnpm db:validate
pnpm db:generate
pnpm --filter @songforge/web build
git diff --check
git status --short
```

Expected: all commands exit 0. If existing unrelated repo failures appear, record them precisely rather than hiding them with `continue-on-error`.

- [ ] **Step 4: Commit verified fixes**

```bash
git add .
git commit -m "test(video): verify Wisebase-first v0.2a workflow"
```

- [ ] **Step 5: Push feature branch and create a draft PR**

Create `agent/video-factory-wisebase-v0.2a` from the approved spec branch before Task 1 implementation. After all tasks and verification, open a **draft** PR to `main` with:
- BuildGraph outcome `EXTEND_EXISTING`;
- fixture 002 as current quality target;
- direct Wisebase API explicitly unverified;
- captions required for verification;
- exact tests/build evidence;
- no deployment/merge performed.

Do not merge or deploy.

---

## Self-review result

- **Spec coverage:** every v0.2a acceptance criterion maps to Tasks 1–8.
- **Scope:** one bounded subsystem: Wisebase-first video run wrapper. Multi-provider video generation remains deferred.
- **Type consistency:** `VideoGenerationBrief`, `VideoMutation`, `VideoRunStatus`, `VideoRunRepository`, `CaptionTimeline`, and `VideoRunService` are introduced before downstream use.
- **No false integration claim:** the plan never calls an undocumented Wisebase HTTP endpoint; it ingests connector-mediated receipts.
- **No false caption claim:** missing captions block verification; automatic alignment is explicitly unconfigured by default.
- **No fabricated fixture metadata:** fixture 002 stores only provider-reported metrics and user-approved quality state until the file is independently inspected.
