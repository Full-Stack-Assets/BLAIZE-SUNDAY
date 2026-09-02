import { createHash, randomUUID } from "node:crypto";
import { open, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";

import type { RouteNoteExecutionReceipt } from "../../../packages/integrations/src/index.ts";
import type { ReleaseRepository } from "../../../packages/release/src/index.ts";
import { RouteNoteRunnerError } from "./errors.ts";
import { ensurePrivateDirectory, routeNoteReceiptRoot } from "./state.ts";

export interface DraftReceiptRuntime {
  now(): Date;
  id(): string;
}

const defaultRuntime: DraftReceiptRuntime = {
  now: () => new Date(),
  id: () => `event-${randomUUID()}`
};

function receiptPolicyError(): RouteNoteRunnerError {
  return new RouteNoteRunnerError(
    "ROUTENOTE_STATE_POLICY_VIOLATION",
    "The persisted RouteNote DRAFT_READY receipt is invalid."
  );
}

function releaseDirectoryName(releaseId: string): string {
  return createHash("sha256").update(releaseId).digest("hex").slice(0, 24);
}

function normalizedPayloadHash(payloadHash: string): string {
  const value = payloadHash.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(value)) throw receiptPolicyError();
  return value;
}

function receiptPathFor(
  releaseId: string,
  payloadHash: string,
  workspaceRoot: string,
  env: NodeJS.ProcessEnv
): { directory: string; path: string } {
  const directory = join(
    routeNoteReceiptRoot(workspaceRoot, env),
    releaseDirectoryName(releaseId)
  );
  return {
    directory,
    path: join(directory, `${normalizedPayloadHash(payloadHash)}.json`)
  };
}

function receiptEquivalent(
  left: RouteNoteExecutionReceipt,
  right: RouteNoteExecutionReceipt
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseReceipt(value: string): RouteNoteExecutionReceipt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw receiptPolicyError();
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as RouteNoteExecutionReceipt).outcome !== "DRAFT_READY" ||
    typeof (parsed as RouteNoteExecutionReceipt).releaseId !== "string" ||
    typeof (parsed as RouteNoteExecutionReceipt).payloadHash !== "string"
  ) {
    throw receiptPolicyError();
  }
  return parsed as RouteNoteExecutionReceipt;
}

export async function loadDraftReadyReceipt(
  releaseId: string,
  payloadHash: string,
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<RouteNoteExecutionReceipt | null> {
  const location = receiptPathFor(releaseId, payloadHash, workspaceRoot, env);
  let raw: string;
  try {
    raw = await readFile(location.path, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }
    throw receiptPolicyError();
  }
  const receipt = parseReceipt(raw);
  if (
    receipt.releaseId !== releaseId ||
    receipt.payloadHash.toLowerCase() !== normalizedPayloadHash(payloadHash)
  ) {
    throw receiptPolicyError();
  }
  return receipt;
}

function evidencePayloadHash(evidence: unknown): string | null {
  if (typeof evidence !== "object" || evidence === null) return null;
  const payloadHash = (evidence as { payloadHash?: unknown }).payloadHash;
  return typeof payloadHash === "string" ? payloadHash.toLowerCase() : null;
}

export async function persistDraftReadyReceipt(
  repository: ReleaseRepository,
  receipt: RouteNoteExecutionReceipt,
  workspaceRoot: string,
  runtime: DraftReceiptRuntime = defaultRuntime,
  env: NodeJS.ProcessEnv = process.env
) {
  if (receipt.outcome !== "DRAFT_READY") throw receiptPolicyError();
  const location = receiptPathFor(
    receipt.releaseId,
    receipt.payloadHash,
    workspaceRoot,
    env
  );
  await ensurePrivateDirectory(location.directory);

  const existing = await loadDraftReadyReceipt(
    receipt.releaseId,
    receipt.payloadHash,
    workspaceRoot,
    env
  );
  if (existing) {
    if (!receiptEquivalent(existing, receipt)) throw receiptPolicyError();
  } else {
    const temporaryPath = `${location.path}.part-${randomUUID()}`;
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temporaryPath, location.path);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  const normalizedHash = normalizedPayloadHash(receipt.payloadHash);
  const events = await repository.listReleaseEvents(receipt.releaseId);
  const alreadyRecorded = events.some(
    event =>
      event.type === "ROUTENOTE_DRAFT_READY" &&
      evidencePayloadHash(event.evidence) === normalizedHash
  );
  if (!alreadyRecorded) {
    await repository.appendReleaseEvent({
      id: runtime.id(),
      releaseId: receipt.releaseId,
      type: "ROUTENOTE_DRAFT_READY",
      fromStatus: null,
      toStatus: null,
      actor: "routenote-runner",
      evidence: {
        provider: "routenote-free",
        payloadHash: normalizedHash,
        receipt
      },
      createdAt: runtime.now()
    });
  }

  return { receiptPath: location.path };
}
