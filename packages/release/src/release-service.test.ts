import assert from "node:assert/strict";
import test from "node:test";

import type { ReleasePreparationContext } from "./payloads.ts";
import { InMemoryReleaseRepository, type ReleaseRecord } from "./repository.ts";
import { ReleaseCommandService } from "./release-service.ts";

const now = new Date("2026-08-16T12:00:00.000Z");

function context(): ReleasePreparationContext {
  return {
    releaseId: "release-1",
    projectId: "project-1",
    status: "PREPARED",
    artistName: "BLAIZE SUNDAY",
    title: "Chrome Receipt",
    master: {
      id: "master-1",
      fileUrl: "https://assets.example/master.wav",
      sha256: "a".repeat(64),
      approved: true,
      durationSeconds: 138,
      contentType: "audio/wav"
    },
    coverArt: {
      id: "cover-1",
      fileUrl: "https://assets.example/cover.png",
      sha256: "b".repeat(64),
      approved: true,
      width: 3000,
      height: 3000,
      contentType: "image/png"
    },
    metadata: {
      title: "Chrome Receipt",
      artistName: "BLAIZE SUNDAY",
      genre: "Alt Pop",
      subgenre: "Luxury Glitch Pop",
      language: "en",
      explicit: false,
      description: "The outfit survived. The operating system did not.",
      tags: ["blaize sunday"],
      credits: { primaryArtist: "BLAIZE SUNDAY" }
    },
    rights: {
      approved: true,
      ownershipConfirmed: true,
      provenanceComplete: true,
      warnings: []
    }
  };
}

function release(): ReleaseRecord {
  return {
    id: "release-1",
    projectId: "project-1",
    artistId: "artist-1",
    title: "Chrome Receipt",
    status: "PREPARED",
    provider: null,
    verifiedPlatformUrl: null,
    externalConfirmationId: null,
    createdAt: now,
    updatedAt: now
  };
}

async function setup() {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release());
  await repository.savePreparationContext(context());
  let sequence = 0;
  const service = new ReleaseCommandService(repository, {
    now: () => now,
    id: prefix => `${prefix}-${++sequence}`
  });
  return { repository, service };
}

test("preparing distribution stops at AWAITING_AUTHORIZATION", async () => {
  const { repository, service } = await setup();
  const result = await service.prepareDistribution({
    releaseId: "release-1",
    provider: "test-dsp",
    actor: "distribution_agent"
  });

  assert.equal(result.release.status, "AWAITING_AUTHORIZATION");
  assert.equal(result.preparation.submissionPerformed, false);
  assert.equal(result.approval.status, "PENDING");
  assert.equal(result.approval.payloadHash, result.actionPackage.payloadHash);
  assert.equal((await repository.listReleaseEvents("release-1")).length, 1);
});

test("approving a payload authorizes but does not submit it", async () => {
  const { repository, service } = await setup();
  const prepared = await service.prepareDistribution({
    releaseId: "release-1",
    provider: "test-dsp",
    actor: "distribution_agent"
  });

  const resolved = await service.resolveApproval({
    approvalId: prepared.approval.id,
    decision: "APPROVE",
    payload: prepared.actionPackage.payload,
    actor: "nic"
  });

  assert.equal(resolved.approval.status, "APPROVED");
  assert.equal((await repository.findRelease("release-1"))?.status, "AWAITING_AUTHORIZATION");
  assert.equal((await repository.listExternalReceipts("release-1")).length, 0);
});

test("rejection queues a revision and rolls the package back to PREPARED", async () => {
  const { repository, service } = await setup();
  const prepared = await service.prepareDistribution({
    releaseId: "release-1",
    provider: "test-dsp",
    actor: "distribution_agent"
  });

  await service.resolveApproval({
    approvalId: prepared.approval.id,
    decision: "REJECT",
    payload: prepared.actionPackage.payload,
    actor: "nic",
    note: "Confirm the rights owner before submission."
  });

  assert.equal((await repository.findRelease("release-1"))?.status, "PREPARED");
  const revisions = await repository.listRevisionRequests("release-1");
  assert.equal(revisions[0]?.target, "artist_operations_orchestrator");
  assert.equal(revisions[0]?.status, "QUEUED");
});

test("submission requires exact approval plus an external provider receipt", async () => {
  const { repository, service } = await setup();
  const prepared = await service.prepareDistribution({
    releaseId: "release-1",
    provider: "test-dsp",
    actor: "distribution_agent"
  });
  await service.resolveApproval({
    approvalId: prepared.approval.id,
    decision: "APPROVE",
    payload: prepared.actionPackage.payload,
    actor: "nic"
  });

  await assert.rejects(
    service.recordExternalSubmission({
      releaseId: "release-1",
      actionPackageId: prepared.actionPackage.id,
      approvalId: prepared.approval.id,
      provider: "test-dsp",
      externalConfirmationId: "",
      rawReceipt: {},
      actor: "distribution_executor"
    }),
    /EXTERNAL_CONFIRMATION_REQUIRED/
  );

  const result = await service.recordExternalSubmission({
    releaseId: "release-1",
    actionPackageId: prepared.actionPackage.id,
    approvalId: prepared.approval.id,
    provider: "test-dsp",
    externalConfirmationId: "provider-receipt-1",
    rawReceipt: { status: "received" },
    actor: "distribution_executor"
  });

  assert.equal(result.release.status, "SUBMITTED");
  assert.equal((await repository.listExternalReceipts("release-1")).length, 1);
});
