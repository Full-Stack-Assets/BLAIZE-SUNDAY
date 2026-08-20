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
  await repo.create({
    ...root,
    id: "run-2",
    version: 2,
    parentRunId: "run-1",
    mutation: "MORE_EXPLANATORY"
  });

  assert.equal((await repo.get("run-1"))?.version, 1);
  assert.equal((await repo.listLineage("lineage-1")).length, 2);
});

test("repository refuses execution updates for missing runs", async () => {
  const repo = new InMemoryVideoRunRepository();
  await assert.rejects(
    () => repo.updateExecution("missing", { externalStatus: "pending" }),
    /VIDEO_RUN_NOT_FOUND/
  );
});
