import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { RouteNoteExecutionReceipt } from "../../../packages/integrations/src/index.ts";
import type { ReleaseRepository } from "../../../packages/release/src/index.ts";

export interface DraftReceiptRuntime {
  now(): Date;
  id(): string;
}

const defaultRuntime: DraftReceiptRuntime = {
  now: () => new Date(),
  id: () => `event-${randomUUID()}`
};

function filenameTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export async function persistDraftReadyReceipt(
  repository: ReleaseRepository,
  receipt: RouteNoteExecutionReceipt,
  workspaceRoot: string,
  runtime: DraftReceiptRuntime = defaultRuntime
) {
  const createdAt = runtime.now();
  const receiptDirectory = resolve(
    workspaceRoot,
    ".songforge",
    "routenote",
    "receipts",
    receipt.releaseId
  );
  await mkdir(receiptDirectory, { recursive: true });
  const receiptPath = join(
    receiptDirectory,
    `${filenameTimestamp(createdAt)}-${receipt.payloadHash.slice(0, 12)}.json`
  );
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });

  await repository.appendReleaseEvent({
    id: runtime.id(),
    releaseId: receipt.releaseId,
    type: "ROUTENOTE_DRAFT_READY",
    fromStatus: null,
    toStatus: null,
    actor: "routenote-runner",
    evidence: {
      provider: "routenote-free",
      payloadHash: receipt.payloadHash,
      receipt
    },
    createdAt
  });

  return { receiptPath };
}
