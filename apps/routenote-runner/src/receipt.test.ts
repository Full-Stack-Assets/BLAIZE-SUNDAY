import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { RouteNoteExecutionReceipt } from "../../../packages/integrations/src/index.ts";
import {
  InMemoryReleaseRepository,
  type ReleaseRecord
} from "../../../packages/release/src/index.ts";
import { persistDraftReadyReceipt } from "./receipt.ts";

const NOW = new Date("2026-08-26T05:00:00.000Z");

const release: ReleaseRecord = {
  id: "release-1",
  projectId: "project-1",
  artistId: "artist-1",
  title: "Chrome Receipt",
  status: "AWAITING_AUTHORIZATION",
  provider: "routenote-free",
  verifiedPlatformUrl: null,
  externalConfirmationId: null,
  scheduledReleaseDate: null,
  liveDate: null,
  createdAt: new Date(NOW.getTime() - 1000),
  updatedAt: new Date(NOW.getTime() - 1000)
};

const receipt: RouteNoteExecutionReceipt = {
  releaseId: "release-1",
  payloadHash: "a".repeat(64),
  routeNoteReleaseId: "route-123",
  routeNoteReleaseUrl: "https://www.routenote.com/releases/route-123",
  startedAt: "2026-08-26T04:59:00.000Z",
  finishedAt: "2026-08-26T05:00:00.000Z",
  completedSteps: [
    "SESSION_VERIFIED",
    "DRAFT_RESOLVED",
    "RELEASE_DATA_SAVED",
    "ALBUM_DETAILS_SAVED",
    "AUDIO_UPLOADED",
    "ARTWORK_UPLOADED",
    "STORES_CONFIGURED",
    "PROVIDER_VALIDATED"
  ],
  tracks: [{ trackIndex: 1, title: "Chrome Receipt", uploaded: true }],
  artworkUploaded: true,
  storesConfigured: true,
  outcome: "DRAFT_READY"
};

test("DRAFT_READY persists an append-only evidence event and private JSON receipt", async () => {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release);
  const workspaceRoot = await mkdtemp(join(tmpdir(), "routenote-receipt-"));

  try {
    const result = await persistDraftReadyReceipt(repository, receipt, workspaceRoot, {
      now: () => NOW,
      id: () => "event-draft-ready"
    });

    const events = await repository.listReleaseEvents("release-1");
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], {
      id: "event-draft-ready",
      releaseId: "release-1",
      type: "ROUTENOTE_DRAFT_READY",
      fromStatus: null,
      toStatus: null,
      actor: "routenote-runner",
      evidence: {
        provider: "routenote-free",
        payloadHash: receipt.payloadHash,
        receipt
      },
      createdAt: NOW
    });

    const written = JSON.parse(await readFile(result.receiptPath, "utf8"));
    assert.deepEqual(written, receipt);
    assert.equal(result.receiptPath.includes(".songforge/routenote/receipts/release-1"), true);

    assert.equal((await repository.findRelease("release-1"))?.status, "AWAITING_AUTHORIZATION");
    assert.equal((await repository.listExternalReceipts("release-1")).length, 0);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
