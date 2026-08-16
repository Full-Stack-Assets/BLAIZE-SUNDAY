import assert from "node:assert/strict";
import test from "node:test";

import {
  ApprovalDomainError,
  createApprovalRequest,
  resolveApproval
} from "./approval.ts";

const requestedAt = new Date("2026-08-16T12:00:00.000Z");
const expiresAt = new Date("2026-08-17T12:00:00.000Z");

function pendingApproval() {
  return createApprovalRequest({
    id: "approval-1",
    projectId: "project-1",
    releaseId: "release-1",
    actionType: "DISTRIBUTOR_SUBMISSION",
    payload: { releaseId: "release-1", provider: "test-distributor" },
    requestedBy: "distribution_agent",
    requestedAt,
    expiresAt
  });
}

test("approval accepts only the exact requested payload", () => {
  const outcome = resolveApproval(pendingApproval(), {
    decision: "APPROVE",
    payload: { provider: "test-distributor", releaseId: "release-1" },
    actor: "nic",
    now: new Date("2026-08-16T13:00:00.000Z")
  });

  assert.equal(outcome.approval.status, "APPROVED");
  assert.equal(outcome.approval.resolvedBy, "nic");
  assert.equal(outcome.revisionInstruction, null);
});

test("approval rejects a changed payload", () => {
  assert.throws(
    () =>
      resolveApproval(pendingApproval(), {
        decision: "APPROVE",
        payload: { releaseId: "release-1", provider: "changed" },
        actor: "nic",
        now: new Date("2026-08-16T13:00:00.000Z")
      }),
    new ApprovalDomainError("PAYLOAD_MISMATCH")
  );
});

test("approval rejects an expired request", () => {
  assert.throws(
    () =>
      resolveApproval(pendingApproval(), {
        decision: "APPROVE",
        payload: { releaseId: "release-1", provider: "test-distributor" },
        actor: "nic",
        now: new Date("2026-08-18T12:00:00.000Z")
      }),
    new ApprovalDomainError("APPROVAL_EXPIRED")
  );
});

test("approval requires a reason for rejection", () => {
  assert.throws(
    () =>
      resolveApproval(pendingApproval(), {
        decision: "REJECT",
        payload: { releaseId: "release-1", provider: "test-distributor" },
        actor: "nic",
        now: new Date("2026-08-16T13:00:00.000Z")
      }),
    new ApprovalDomainError("RESOLUTION_NOTE_REQUIRED")
  );
});

test("rejection also creates a structured revision instruction", () => {
  const now = new Date("2026-08-16T13:00:00.000Z");
  const outcome = resolveApproval(pendingApproval(), {
    decision: "REJECT",
    payload: { releaseId: "release-1", provider: "test-distributor" },
    actor: "nic",
    note: "Rights ownership is not confirmed.",
    now
  });

  assert.equal(outcome.approval.status, "REJECTED");
  assert.equal(
    outcome.revisionInstruction?.instruction,
    "Rights ownership is not confirmed."
  );
});

test("approval creates a structured revision instruction", () => {
  const now = new Date("2026-08-16T13:00:00.000Z");
  const outcome = resolveApproval(pendingApproval(), {
    decision: "REQUEST_REVISION",
    payload: { releaseId: "release-1", provider: "test-distributor" },
    actor: "nic",
    note: "Replace the cover art with the approved chrome variant.",
    now
  });

  assert.equal(outcome.approval.status, "REVISION_REQUESTED");
  assert.deepEqual(outcome.revisionInstruction, {
    approvalId: "approval-1",
    projectId: "project-1",
    releaseId: "release-1",
    target: "artist_operations_orchestrator",
    instruction: "Replace the cover art with the approved chrome variant.",
    requestedBy: "nic",
    createdAt: now
  });
});

test("approval cannot be resolved twice", () => {
  const first = resolveApproval(pendingApproval(), {
    decision: "REJECT",
    payload: { releaseId: "release-1", provider: "test-distributor" },
    actor: "nic",
    note: "Rights owner is not confirmed.",
    now: new Date("2026-08-16T13:00:00.000Z")
  });

  assert.throws(
    () =>
      resolveApproval(first.approval, {
        decision: "APPROVE",
        payload: { releaseId: "release-1", provider: "test-distributor" },
        actor: "nic",
        now: new Date("2026-08-16T14:00:00.000Z")
      }),
    new ApprovalDomainError("APPROVAL_ALREADY_RESOLVED")
  );
});
