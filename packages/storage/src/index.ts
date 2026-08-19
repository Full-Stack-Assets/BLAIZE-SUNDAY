import { createHash } from "node:crypto";

export type StorageHealth = "CONNECTED" | "UNCONFIGURED" | "FAILED";

export function storageHealth(): StorageHealth {
  if (!process.env.S3_ENDPOINT || !process.env.S3_BUCKET) return "UNCONFIGURED";
  return "CONNECTED";
}

export function contentHash(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function objectKey(projectId: string, kind: string, sha256: string): string {
  return `artists/blaize/${projectId}/${kind}/${sha256}`;
}
