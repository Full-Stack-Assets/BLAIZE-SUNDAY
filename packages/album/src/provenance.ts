import { readFile, writeFile } from "node:fs/promises";
import { contentHash } from "@songforge/storage";

export interface ChecksumEntry {
  filename: string;
  sha256: string;
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableNormalize(nested)])
    );
  }
  return value;
}

export async function hashFile(path: string): Promise<string> {
  return contentHash(await readFile(path));
}

export async function writeProvenanceReceipt(record: unknown, path: string): Promise<void> {
  const stable = stableNormalize(record);
  await writeFile(path, `${JSON.stringify(stable, null, 2)}\n`, "utf8");
}

export async function writeChecksumFile(entries: ChecksumEntry[], path: string): Promise<void> {
  const text = [...entries]
    .sort((a, b) => a.filename.localeCompare(b.filename))
    .map((entry) => `${entry.sha256}  ${entry.filename}`)
    .join("\n");
  await writeFile(path, `${text}${text ? "\n" : ""}`, "utf8");
}
