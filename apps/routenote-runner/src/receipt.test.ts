import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import type { RouteNoteExecutionReceipt } from "../../../packages/integrations/src/index.ts";
import {
  InMemoryReleaseRepository,
  type ReleaseRecord
} from "../../../packages/release/src/index.ts";
import {
  loadDraftReadyReceipt,
  persistDraftReadyReceipt
} from "./receipt.ts";

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

test("DRAFT_READY persists one append-only evidence event and one private deterministic receipt", async () => {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release);
  const workspaceRoot = await mkdtemp(join(tmpdir(), "routenote-receipt-"));

  try {
    const first = await persistDraftReadyReceipt(repository, receipt, workspaceRoot, {
      now: () => NOW,
      id: () => "event-draft-ready"
    });
    const second = await persistDraftReadyReceipt(repository, receipt, workspaceRoot, {
      now: () => new Date(NOW.getTime() + 1000),
      id: () => "must-not-be-used"
    });

    assert.equal(first.receiptPath, second.receiptPath);
    assert.equal(first.receiptPath.includes("release-1"), false);
    assert.equal(first.receiptPath.endsWith(`${receipt.payloadHash}.json`), true);
    assert.deepEqual(JSON.parse(await readFile(first.receiptPath, "utf8")), receipt);
    assert.equal((await stat(first.receiptPath)).mode & 0o077, 0);

    const loaded = await loadDraftReadyReceipt(
      receipt.releaseId,
      receipt.payloadHash,
      workspaceRoot
    );
    assert.deepEqual(loaded, receipt);

    const events = await repository.listReleaseEvents("release-1");
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, "ROUTENOTE_DRAFT_READY");
    assert.equal((await repository.findRelease("release-1"))?.status, "AWAITING_AUTHORIZATION");
    assert.equal((await repository.listExternalReceipts("release-1")).length, 0);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
