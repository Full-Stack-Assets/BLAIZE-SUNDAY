import assert from "node:assert/strict";
import test from "node:test";

import { createApprovalRequest } from "./approval.ts";
import {
  InMemoryReleaseRepository,
  type ActionPackageRecord,
  type ReleaseRecord
} from "./repository.ts";

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
    createdAt: new Date("2026-08-16T12:00:00.000Z"),
    updatedAt: new Date("2026-08-16T12:00:00.000Z")
  };
}

test("repository stores and updates releases without duplicating them", async () => {
  const repository = new InMemoryReleaseRepository();
  await repository.saveRelease(release());
  await repository.saveRelease({
    ...release(),
    status: "AWAITING_AUTHORIZATION",
    updatedAt: new Date("2026-08-16T13:00:00.000Z")
  });

  assert.equal((await repository.listReleases()).length, 1);
  assert.equal(
    (await repository.findRelease("release-1"))?.status,
    "AWAITING_AUTHORIZATION"
  );
});

test("repository persists the action package and payload-bound approval", async () => {
  const repository = new InMemoryReleaseRepository();
  const actionPackage: ActionPackageRecord = {
    id: "package-1",
    releaseId: "release-1",
    actionType: "DISTRIBUTOR_SUBMISSION",
    provider: "test-dsp",
    payload: { releaseId: "release-1" },
    payloadHash: "a".repeat(64),
    createdAt: new Date("2026-08-16T12:00:00.000Z")
  };
  const approval = createApprovalRequest({
    id: "approval-1",
    projectId: "project-1",
    releaseId: "release-1",
    actionType: actionPackage.actionType,
    payload: actionPackage.payload,
    requestedBy: "distribution_agent",
    requestedAt: new Date("2026-08-16T12:00:00.000Z"),
    expiresAt: new Date("2026-08-17T12:00:00.000Z")
  });

  await repository.saveActionPackage(actionPackage);
  await repository.saveApproval(approval);

  assert.deepEqual(
    await repository.findActionPackage("package-1"),
    actionPackage
  );
  assert.equal(
    (await repository.findApproval("approval-1"))?.payloadHash,
    approval.payloadHash
  );
});

test("release events and revision requests remain append-only", async () => {
  const repository = new InMemoryReleaseRepository();
  const event = {
    id: "event-1",
    releaseId: "release-1",
    type: "STATUS_CHANGED",
    fromStatus: "PREPARED" as const,
    toStatus: "AWAITING_AUTHORIZATION" as const,
    actor: "distribution_agent",
    evidence: { payloadHash: "a".repeat(64) },
    createdAt: new Date("2026-08-16T12:00:00.000Z")
  };
  const revision = {
    id: "revision-1",
    approvalId: "approval-1",
    projectId: "project-1",
    releaseId: "release-1",
    target: "artist_operations_orchestrator" as const,
    instruction: "Replace the artwork.",
    requestedBy: "nic",
    status: "QUEUED" as const,
    createdAt: new Date("2026-08-16T13:00:00.000Z")
  };

  await repository.appendReleaseEvent(event);
  await repository.appendRevisionRequest(revision);

  await assert.rejects(
    repository.appendReleaseEvent(event),
    /RELEASE_EVENT_ALREADY_EXISTS/
  );
  await assert.rejects(
    repository.appendRevisionRequest(revision),
    /REVISION_REQUEST_ALREADY_EXISTS/
  );
  assert.equal((await repository.listReleaseEvents("release-1")).length, 1);
  assert.equal((await repository.listRevisionRequests("release-1")).length, 1);
});
